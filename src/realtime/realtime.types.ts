import { randomUUID } from "node:crypto";

/** 订阅主题，连接必须包含 notice */
export const REALTIME_TOPICS = {
  NOTICE: "notice",
  DICT: "dict",
  PRESENCE: "presence",
} as const;

/** 当前支持的订阅主题 */
export const SUPPORTED_TOPICS: string[] = [
  REALTIME_TOPICS.NOTICE,
  REALTIME_TOPICS.DICT,
  REALTIME_TOPICS.PRESENCE,
];

/** 消息类型 */
export const REALTIME_EVENTS = {
  CONNECTION_READY: "connection.ready",
  HEARTBEAT_PING: "heartbeat.ping",
  NOTICE_CHANGED: "notice.changed",
  DICT_CHANGED: "dict.changed",
  PRESENCE_SNAPSHOT: "presence.snapshot",
  HEARTBEAT_PONG: "heartbeat.pong",
} as const;

/** 心跳应答超时时间（毫秒） */
export const HEARTBEAT_TIMEOUT_MS = 60000;

/** 实时消息 */
export interface RealtimeMessage {
  version: number;
  id: string;
  type: string;
  payload?: unknown;
}

/** 节点在线状态快照 */
export interface RealtimePresenceSnapshot {
  readonly onlineUsers: number;
  readonly onlineConnections: number;
  readonly nodeId: string;
  readonly observedAt: string;
}

/** 票据承载的握手授权内容 */
export interface RealtimeTicketGrant {
  accessToken: string;
  username: string;
  topics: string[];
  expiresAt: number;
}

/** 客户端心跳响应载荷 */
export interface RealtimePongPayload {
  pingId: string;
}

/** 创建服务端消息并生成唯一标识 */
export function createRealtimeMessage(type: string, payload?: unknown): RealtimeMessage {
  return {
    version: 1,
    id: randomUUID().replace(/-/g, ""),
    type,
    payload,
  };
}

/** 解析客户端心跳响应，非心跳消息返回 null */
export function parsePong(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || parsed.type !== REALTIME_EVENTS.HEARTBEAT_PONG) {
      return null;
    }
    const pingId = parsed.payload?.pingId;
    return typeof pingId === "string" && pingId.length > 0 ? pingId : null;
  } catch {
    return null;
  }
}