import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

interface JwtPayload {
  sub: string;
  username: string;
}

@WebSocketGateway({ path: "/ws", cors: { origin: "*" } })
@Injectable()
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>("jwt.secret");
      const payload = (await this.jwtService.verifyAsync(token, { secret })) as JwtPayload;
      const username = payload.username;

      if (!username) {
        client.disconnect();
        return;
      }

      const existing = this.userSockets.get(username) || new Set<string>();
      existing.add(client.id);
      this.userSockets.set(username, existing);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    for (const [username, sockets] of this.userSockets.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(username);
        }
        break;
      }
    }
  }

  @SubscribeMessage("ping")
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() data: any) {
    client.emit("pong", data ?? "pong");
  }

  /** 向指定用户发送通知 */
  sendNotification(username: string, payload: any) {
    const sockets = this.userSockets.get(username);
    if (!sockets || sockets.size === 0) return;
    for (const id of sockets) {
      this.server.to(id).emit("notice", payload);
    }
  }

  /** 广播通知给所有在线用户 */
  broadcastNotification(payload: any) {
    this.server.emit("notice", payload);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers["authorization"] as string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    const token = client.handshake.query["token"];
    if (typeof token === "string") {
      return token;
    }
    return null;
  }
}
