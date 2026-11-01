import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { OnlineUserDto } from "./interfaces/online-user.interface";

interface SessionInfo {
  username: string;
  connectTime: number;
}

/**
 * 实时会话注册表，维护连接所属用户与在线状态
 */
@Injectable()
export class RealtimeSessionRegistry implements OnModuleDestroy {
  private readonly userClientsMap: Map<string, Set<any>> = new Map();
  private readonly clientUserMap: Map<any, SessionInfo> = new Map();

  /** 节点标识，进程内固定，用于前端区分多节点部署 */
  private readonly nodeId = randomUUID().replace(/-/g, "");

  /** 用户上线 */
  userConnected(username: string, client: any): void {
    if (!this.userClientsMap.has(username)) {
      this.userClientsMap.set(username, new Set());
    }
    this.userClientsMap.get(username)!.add(client);
    this.clientUserMap.set(client, {
      username,
      connectTime: Date.now(),
    });
  }

  /** 移除指定连接 */
  removeClient(client: any): void {
    const sessionInfo = this.clientUserMap.get(client);
    if (!sessionInfo) {
      return;
    }
    this.clientUserMap.delete(client);
    const clients = this.userClientsMap.get(sessionInfo.username);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.userClientsMap.delete(sessionInfo.username);
      }
    }
  }

  /** 在线用户数，按用户去重 */
  getOnlineUserCount(): number {
    return this.userClientsMap.size;
  }

  /** 连接总数 */
  getTotalConnectionCount(): number {
    return this.clientUserMap.size;
  }

  /** 节点标识 */
  getNodeId(): string {
    return this.nodeId;
  }

  /** 用户是否在线 */
  isUserOnline(username: string): boolean {
    const clients = this.userClientsMap.get(username);
    return clients !== undefined && clients.size > 0;
  }

  /** 在线用户列表，登录时间取最早的连接时间 */
  getOnlineUsers(): OnlineUserDto[] {
    const result: OnlineUserDto[] = [];
    this.userClientsMap.forEach((clients, username) => {
      let earliestLoginTime = Infinity;
      clients.forEach((client) => {
        const sessionInfo = this.clientUserMap.get(client);
        if (sessionInfo && sessionInfo.connectTime < earliestLoginTime) {
          earliestLoginTime = sessionInfo.connectTime;
        }
      });

      result.push({
        username,
        sessionCount: clients.size,
        loginTime: earliestLoginTime === Infinity ? Date.now() : earliestLoginTime,
      });
    });
    return result;
  }

  /** 全部连接 */
  getAllClients(): Set<any> {
    return new Set(this.clientUserMap.keys());
  }

  /** 指定用户的连接列表 */
  getUserClients(username: string): Set<any> | undefined {
    return this.userClientsMap.get(username);
  }

  /** 应用停机时关闭全部连接 */
  onModuleDestroy() {
    this.clientUserMap.forEach((_sessionInfo, client) => {
      try {
        client.close?.();
      } catch {
        // 忽略关闭异常
      }
    });
    this.userClientsMap.clear();
    this.clientUserMap.clear();
  }
}