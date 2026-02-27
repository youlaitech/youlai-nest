import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { HttpAdapterHost } from "@nestjs/core";
import { WebSocketServer, WebSocket } from "ws";
import { UserSessionRegistry } from "./user-session-registry";

interface JwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class WebsocketGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WebsocketGateway.name);

  private wss: WebSocketServer | null = null;

  private readonly clientUsername = new Map<WebSocket, string>();
  private readonly clientSubscriptions = new Map<WebSocket, Set<string>>();
  private readonly clientSubscriptionIds = new Map<WebSocket, Map<string, string>>();
  private readonly destinationSubscribers = new Map<string, Set<WebSocket>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly userSessionRegistry: UserSessionRegistry
  ) {}

  onModuleInit() {
    const httpServer = this.httpAdapterHost.httpAdapter?.getHttpServer();
    if (!httpServer) {
      return;
    }

    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    this.wss.on("connection", (socket) => {
      this.logger.debug(`WS connected: sessionId=${this.getSessionId(socket)}`);
      this.clientSubscriptions.set(socket, new Set());
      this.clientSubscriptionIds.set(socket, new Map());

      socket.on("message", async (data) => {
        const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
        await this.handleIncoming(socket, text);
      });

      socket.on("close", () => {
        this.logger.debug(`WS closed: sessionId=${this.getSessionId(socket)}`);
        this.cleanupClient(socket);
      });
    });
  }

  onModuleDestroy() {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.clientUsername.clear();
    this.clientSubscriptions.clear();
    this.clientSubscriptionIds.clear();
    this.destinationSubscribers.clear();
  }

  /** 向指定用户发送通知 */
  sendNotification(username: string, payload: any) {
    this.sendToDestination(`/user/${username}/queue/notice`, payload);
  }

  /** 广播通知给所有在线用户 */
  broadcastNotification(payload: any) {
    this.sendToDestination(`/topic/notice`, payload);
  }

  private async handleIncoming(socket: WebSocket, raw: string) {
    const frames = this.splitFrames(raw);
    for (const frameText of frames) {
      const frame = this.parseFrame(frameText);
      if (!frame) continue;

      switch (frame.command) {
        case "CONNECT":
        case "STOMP": {
          const ok = await this.authenticateConnect(socket, frame.headers);
          if (!ok) {
            this.sendFrame(socket, "ERROR", { message: "Unauthorized" }, "Unauthorized");
            socket.close();
            return;
          }
          this.sendFrame(socket, "CONNECTED", { version: "1.2" });
          break;
        }

        case "SUBSCRIBE": {
          const destination = frame.headers["destination"];
          const id = frame.headers["id"];
          if (!destination) break;
          this.subscribe(socket, destination, id);
          break;
        }

        case "UNSUBSCRIBE": {
          const id = frame.headers["id"];
          const destination = frame.headers["destination"];
          if (id) {
            this.unsubscribeById(socket, id);
            break;
          }
          if (!destination) break;
          this.unsubscribe(socket, destination);
          break;
        }

        case "DISCONNECT": {
          socket.close();
          break;
        }

        default:
          break;
      }
    }
  }

  private async authenticateConnect(
    socket: WebSocket,
    headers: Record<string, string>
  ): Promise<boolean> {
    try {
      const auth = headers["Authorization"] || headers["authorization"];
      if (!auth || !auth.startsWith("Bearer ")) {
        this.logger.warn("STOMP CONNECT missing Authorization header");
        this.logger.debug(
          `STOMP CONNECT rejected: sessionId=${this.getSessionId(socket)} authorizationPresent=${Boolean(auth)}`
        );
        return false;
      }

      const token = auth.slice(7);
      const secret = this.configService.getOrThrow<string>("jwt.secretKey");
      if (!secret) {
        this.logger.warn("STOMP CONNECT JWT secret is not configured");
        return false;
      }
      const payload = (await this.jwtService.verifyAsync(token, { secret })) as JwtPayload;
      const username = payload.username;
      if (!username) {
        this.logger.warn("STOMP CONNECT JWT payload missing username");
        this.logger.debug(
          `STOMP CONNECT rejected: sessionId=${this.getSessionId(socket)} missingUsername=true`
        );
        return false;
      }

      this.clientUsername.set(socket, username);
      this.userSessionRegistry.userConnected(username, this.getSessionId(socket));
      this.logger.debug(
        `STOMP CONNECT accepted: sessionId=${this.getSessionId(socket)} username=${username} onlineUsers=${this.userSessionRegistry.getOnlineUserCount()} totalSessions=${this.userSessionRegistry.getTotalSessionCount()}`
      );
      this.publishOnlineCount();
      return true;
    } catch (e) {
      this.logger.warn("STOMP CONNECT JWT verification failed", e as any);
      this.logger.debug(
        `STOMP CONNECT rejected: sessionId=${this.getSessionId(socket)} jwtVerifyFailed=true`
      );
      return false;
    }
  }

  private subscribe(socket: WebSocket, destination: string, subscriptionId?: string) {
    this.logger.debug(
      `STOMP SUBSCRIBE: sessionId=${this.getSessionId(socket)} destination=${destination} username=${this.clientUsername.get(socket) ?? ""}`
    );

    if (subscriptionId) {
      this.clientSubscriptionIds.get(socket)?.set(destination, subscriptionId);
    }

    let set = this.destinationSubscribers.get(destination);
    if (!set) {
      set = new Set<WebSocket>();
      this.destinationSubscribers.set(destination, set);
    }
    set.add(socket);

    const subs = this.clientSubscriptions.get(socket) ?? new Set<string>();
    subs.add(destination);
    this.clientSubscriptions.set(socket, subs);

    if (destination === "/topic/online-count") {
      this.publishOnlineCountToSocket(socket);
    }
  }

  private unsubscribe(socket: WebSocket, destination: string) {
    const set = this.destinationSubscribers.get(destination);
    if (set) {
      set.delete(socket);
      if (set.size === 0) {
        this.destinationSubscribers.delete(destination);
      }
    }

    this.clientSubscriptionIds.get(socket)?.delete(destination);

    const subs = this.clientSubscriptions.get(socket);
    if (subs) {
      subs.delete(destination);
    }
  }

  private unsubscribeById(socket: WebSocket, id: string) {
    const mapping = this.clientSubscriptionIds.get(socket);
    if (!mapping) return;
    for (const [destination, subId] of mapping.entries()) {
      if (subId === id) {
        this.unsubscribe(socket, destination);
        break;
      }
    }
  }

  private cleanupClient(socket: WebSocket) {
    const subs = this.clientSubscriptions.get(socket);
    if (subs) {
      for (const destination of subs) {
        const set = this.destinationSubscribers.get(destination);
        if (set) {
          set.delete(socket);
          if (set.size === 0) {
            this.destinationSubscribers.delete(destination);
          }
        }
      }
    }
    this.clientSubscriptions.delete(socket);
    this.clientSubscriptionIds.delete(socket);
    const username = this.clientUsername.get(socket);
    this.clientUsername.delete(socket);

    if (username) {
      this.userSessionRegistry.removeSession(this.getSessionId(socket));
      this.logger.debug(
        `WS cleanup: sessionId=${this.getSessionId(socket)} username=${username} onlineUsers=${this.userSessionRegistry.getOnlineUserCount()} totalSessions=${this.userSessionRegistry.getTotalSessionCount()}`
      );
      this.publishOnlineCount();
    }
  }

  private publishOnlineCount() {
    const count = this.userSessionRegistry.getOnlineUserCount();
    this.logger.debug(
      `PUBLISH /topic/online-count: count=${count} totalSessions=${this.userSessionRegistry.getTotalSessionCount()}`
    );
    this.sendToDestination("/topic/online-count", { count, timestamp: Date.now() });
  }

  private publishOnlineCountToSocket(socket: WebSocket) {
    const count = this.userSessionRegistry.getOnlineUserCount();
    if (socket.readyState !== WebSocket.OPEN) return;

    const subscription = this.clientSubscriptionIds.get(socket)?.get("/topic/online-count");
    const headers: Record<string, string> = { destination: "/topic/online-count" };
    if (subscription) {
      headers["subscription"] = subscription;
    }
    headers["message-id"] = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    this.sendFrame(
      socket,
      "MESSAGE",
      headers,
      JSON.stringify({
        count,
        timestamp: Date.now(),
      })
    );
  }

  private getSessionId(socket: WebSocket): string {
    return (socket as any)._socket?.remoteAddress
      ? `${(socket as any)._socket.remoteAddress}:${(socket as any)._socket.remotePort}`
      : String((socket as any) ?? "");
  }

  private sendToDestination(destination: string, payload: any) {
    const subscribers = this.destinationSubscribers.get(destination);
    if (!subscribers || subscribers.size === 0) return;

    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    for (const socket of subscribers) {
      if (socket.readyState !== WebSocket.OPEN) continue;

      const subscription = this.clientSubscriptionIds.get(socket)?.get(destination);
      const headers: Record<string, string> = { destination };
      if (subscription) {
        headers["subscription"] = subscription;
      }
      headers["message-id"] = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.sendFrame(socket, "MESSAGE", headers, body);
    }
  }

  private sendFrame(
    socket: WebSocket,
    command: string,
    headers: Record<string, string> = {},
    body: string = ""
  ) {
    const lines: string[] = [command];
    for (const [k, v] of Object.entries(headers)) {
      lines.push(`${k}:${v}`);
    }
    lines.push("", body);
    const frame = lines.join("\n") + "\u0000";
    socket.send(frame);
  }

  private splitFrames(raw: string): string[] {
    return raw
      .split("\u0000")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private parseFrame(
    raw: string
  ): { command: string; headers: Record<string, string>; body: string } | null {
    const normalized = raw.replace(/\r\n/g, "\n");
    const [headerPart, ...bodyParts] = normalized.split("\n\n");
    if (!headerPart) return null;

    const headerLines = headerPart.split("\n").filter(Boolean);
    const command = headerLines.shift();
    if (!command) return null;

    const headers: Record<string, string> = {};
    for (const line of headerLines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k) headers[k] = v;
    }

    const body = bodyParts.join("\n\n");
    return { command: command.trim(), headers, body };
  }
}
