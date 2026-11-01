import { Injectable, Logger } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { RedisService } from "../common/redis/redis.service";
import { RealtimeSessionRegistry } from "./realtime-session-registry.service";
import {
  REALTIME_EVENTS,
  REALTIME_TOPICS,
  RealtimeMessage,
  RealtimePresenceSnapshot,
  RealtimeTicketGrant,
  createRealtimeMessage,
} from "./realtime.types";

/** 票据有效期（秒） */
const TICKET_TTL_SECONDS = 30;

/** 票据 Redis 键前缀 */
const TICKET_KEY_PREFIX = "realtime:ticket:";

/**
 * 实时消息服务，负责主题广播、定向推送与一次性票据
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly sessionRegistry: RealtimeSessionRegistry,
    private readonly redisService: RedisService
  ) {}

  /** 签发一次性握手票据 */
  async createTicket(username: string, accessToken: string, topics: string[]): Promise<string> {
    const ticket = randomUUID().replace(/-/g, "");
    const grant: RealtimeTicketGrant = {
      accessToken,
      username,
      topics,
      expiresAt: Date.now() + TICKET_TTL_SECONDS * 1000,
    };
    await this.redisService.set(this.ticketKey(ticket), grant, TICKET_TTL_SECONDS);
    return ticket;
  }

  /** 取出并删除票据，无效、已使用或已过期返回 null */
  async consumeTicket(ticket: string): Promise<RealtimeTicketGrant | null> {
    if (!ticket || ticket.length < 43 || ticket.length > 256) {
      return null;
    }
    const key = this.ticketKey(ticket);
    const grant = await this.redisService.get<RealtimeTicketGrant>(key);
    if (!grant) {
      return null;
    }
    await this.redisService.del(key);
    if (grant.expiresAt <= Date.now()) {
      return null;
    }
    return grant;
  }

  /** 向订阅了该主题的连接广播消息 */
  broadcast(topic: string, type: string, payload?: unknown): void {
    const message = createRealtimeMessage(type, payload);
    this.sessionRegistry.getAllClients().forEach((client: any) => {
      const topics: string[] = client.topics ?? [];
      if (!topics.includes(topic)) {
        return;
      }
      this.send(client, message);
    });
  }

  /** 向指定用户的全部连接推送消息 */
  sendToUser(username: string, type: string, payload?: unknown): void {
    const message = createRealtimeMessage(type, payload);
    this.sessionRegistry.getUserClients(username)?.forEach((client: any) => {
      this.send(client, message);
    });
  }

  /** 广播字典变更 */
  sendDictChange(dictCode: string): void {
    if (!dictCode) {
      return;
    }
    this.broadcast(REALTIME_TOPICS.DICT, REALTIME_EVENTS.DICT_CHANGED, { dictCode });
  }

  /** 广播在线状态快照 */
  sendOnlineCount(): void {
    this.broadcast(
      REALTIME_TOPICS.PRESENCE,
      REALTIME_EVENTS.PRESENCE_SNAPSHOT,
      this.presenceSnapshot()
    );
  }

  /** 生成在线状态快照 */
  presenceSnapshot(): RealtimePresenceSnapshot {
    return {
      onlineUsers: this.sessionRegistry.getOnlineUserCount(),
      onlineConnections: this.sessionRegistry.getTotalConnectionCount(),
      nodeId: this.sessionRegistry.getNodeId(),
      observedAt: new Date().toISOString(),
    };
  }

  /** 在线用户列表 */
  getOnlineUsers() {
    return this.sessionRegistry.getOnlineUsers();
  }

  /** 在线用户数 */
  getOnlineUserCount(): number {
    return this.sessionRegistry.getOnlineUserCount();
  }

  /** 向单个连接发送消息，失败则移除连接 */
  private send(client: any, message: RealtimeMessage): void {
    try {
      client.send(JSON.stringify(message));
    } catch {
      this.logger.warn(`发送实时消息失败: username=${client.username}`);
      this.sessionRegistry.removeClient(client);
    }
  }

  /** Redis 键只保存票据摘要 */
  private ticketKey(ticket: string): string {
    return `${TICKET_KEY_PREFIX}${createHash("sha256").update(ticket).digest("hex")}`;
  }
}