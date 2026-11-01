import { Logger, OnModuleDestroy } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { IncomingMessage } from "node:http";
import { RealtimeService } from "./realtime.service";
import { RealtimeSessionRegistry } from "./realtime-session-registry.service";
import {
  HEARTBEAT_TIMEOUT_MS,
  REALTIME_EVENTS,
  RealtimeMessage,
  createRealtimeMessage,
  parsePong,
} from "./realtime.types";

/** 心跳间隔与超时（秒），与 youlai-boot 保持一致 */
const PING_INTERVAL_SECONDS = 25;
const PONG_TIMEOUT_SECONDS = 60;

/**
 * 实时连接网关，握手只接受一次性票据，消息格式为原生 WebSocket 文本帧
 */
@WebSocketGateway({ path: "/api/v1/realtime/ws" })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  private server: any;

  private readonly logger = new Logger(RealtimeGateway.name);
  private pingTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly sessionRegistry: RealtimeSessionRegistry,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  afterInit(server: any) {
    this.pingTimer = setInterval(() => this.sendHeartbeat(), PING_INTERVAL_SECONDS * 1000);
    this.logger.log("实时连接网关已初始化");
  }

  /** 握手时消费票据，无效则断开连接 */
  async handleConnection(client: any, request: IncomingMessage) {
    const ticket = this.readTicket(request);
    const grant = ticket ? await this.realtimeService.consumeTicket(ticket) : null;
    if (!grant) {
      this.logger.warn("握手票据无效或已使用");
      client.close(4001, "invalid ticket");
      return;
    }

    // 复核访问凭证，避免票据签发后令牌失效仍能建立连接
    try {
      const secret = this.configService.getOrThrow<string>("jwt.secretKey");
      const payload = await this.jwtService.verifyAsync(grant.accessToken, { secret });
      if (!payload.username) {
        throw new Error("invalid token");
      }
    } catch {
      this.logger.warn("握手票据对应的访问凭证已失效");
      client.close(4001, "invalid credential");
      return;
    }

    client.username = grant.username;
    client.topics = grant.topics;
    client.lastPongAt = Date.now();
    client.pendingPingId = "";

    this.sessionRegistry.userConnected(grant.username, client);
    this.send(
      client,
      createRealtimeMessage(REALTIME_EVENTS.CONNECTION_READY, { heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS })
    );
    this.realtimeService.sendOnlineCount();
  }

  /** 连接断开后注销 */
  handleDisconnect(client: any) {
    this.sessionRegistry.removeClient(client);
    this.realtimeService.sendOnlineCount();
  }

  /** 接收客户端心跳响应，其余消息忽略 */
  @SubscribeMessage("message")
  handleMessage(@ConnectedSocket() client: any, @MessageBody() data: string) {
    const pingId = parsePong(data);
    if (pingId && pingId === client.pendingPingId) {
      client.pendingPingId = "";
      client.lastPongAt = Date.now();
    }
  }

  onModuleDestroy() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /** 定时发送心跳，超时未响应则断开连接 */
  private sendHeartbeat() {
    const now = Date.now();
    this.sessionRegistry.getAllClients().forEach((client: any) => {
      if (now - (client.lastPongAt ?? now) >= PONG_TIMEOUT_SECONDS * 1000) {
        this.logger.warn(`连接心跳超时: username=${client.username}`);
        client.close(4011, "heartbeat timeout");
        this.sessionRegistry.removeClient(client);
        return;
      }

      const ping = createRealtimeMessage(REALTIME_EVENTS.HEARTBEAT_PING, {});
      client.pendingPingId = ping.id;
      this.send(client, ping);
    });
  }

  /** 向单个连接发送消息 */
  private send(client: any, message: RealtimeMessage) {
    try {
      client.send(JSON.stringify(message));
    } catch {
      this.sessionRegistry.removeClient(client);
    }
  }

  /** 读取握手票据，地址只接受 ticket 一个查询参数 */
  private readTicket(request: IncomingMessage): string | null {
    const url = request.url ?? "";
    const queryIndex = url.indexOf("?");
    if (queryIndex < 0) {
      return null;
    }
    const params = new URLSearchParams(url.slice(queryIndex + 1));
    if (Array.from(params.keys()).length !== 1) {
      return null;
    }
    return params.get("ticket");
  }
}