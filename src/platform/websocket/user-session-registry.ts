/**
 * WebSocket 用户会话注册表
 * 
 * 维护WebSocket连接的用户会话信息，支持多设备同时登录。
 * 采用双Map结构实现高效查询：
 * - userSessionsMap: 用户名 -> 会话ID集合（支持多设备）
 * - sessionDetailsMap: 会话ID -> 会话详情（快速定位用户）
 */

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { OnlineUserDto } from '../../auth/models/user-session.model';

/**
 * 会话详情（内部使用）
 */
interface SessionInfo {
  username: string;
  sessionId: string;
  connectTime: number;
}

/**
 * WebSocket 用户会话注册表
 */
@Injectable()
export class UserSessionRegistry implements OnModuleDestroy {
  /**
   * 用户会话映射表
   * Key: 用户名
   * Value: 该用户所有WebSocket会话ID集合（支持多设备登录）
   */
  private readonly userSessionsMap: Map<string, Set<string>> = new Map();

  /**
   * 会话详情映射表
   * Key: WebSocket会话ID
   * Value: 会话详情（包含用户名、连接时间等）
   */
  private readonly sessionDetailsMap: Map<string, SessionInfo> = new Map();

  /**
   * 用户上线（建立WebSocket连接）
   * 
   * @param username 用户名
   * @param sessionId WebSocket会话ID
   */
  userConnected(username: string, sessionId: string): void {
    if (!this.userSessionsMap.has(username)) {
      this.userSessionsMap.set(username, new Set());
    }
    this.userSessionsMap.get(username)!.add(sessionId);
    this.sessionDetailsMap.set(sessionId, {
      username,
      sessionId,
      connectTime: Date.now(),
    });
  }

  /**
   * 用户下线（断开所有WebSocket连接）
   * 移除该用户的所有会话信息
   * 
   * @param username 用户名
   */
  userDisconnected(username: string): void {
    const sessions = this.userSessionsMap.get(username);
    if (sessions) {
      sessions.forEach((sessionId) => {
        this.sessionDetailsMap.delete(sessionId);
      });
    }
    this.userSessionsMap.delete(username);
  }

  /**
   * 移除指定会话（单设备下线）
   * 当用户某一设备断开连接时调用，保留其他设备的会话
   * 
   * @param sessionId WebSocket会话ID
   */
  removeSession(sessionId: string): void {
    const sessionInfo = this.sessionDetailsMap.get(sessionId);
    if (!sessionInfo) {
      return;
    }

    this.sessionDetailsMap.delete(sessionId);
    const sessions = this.userSessionsMap.get(sessionInfo.username);
    if (sessions) {
      sessions.delete(sessionId);
      if (sessions.size === 0) {
        // 该用户没有任何会话了，移除用户记录
        this.userSessionsMap.delete(sessionInfo.username);
      }
    }
  }

  /**
   * 获取在线用户数量
   * 
   * @returns 当前在线用户数（非会话数）
   */
  getOnlineUserCount(): number {
    return this.userSessionsMap.size;
  }

  /**
   * 获取指定用户的会话数量
   * 
   * @param username 用户名
   * @returns 该用户的WebSocket会话数量（多设备登录时大于1）
   */
  getUserSessionCount(username: string): number {
    const sessions = this.userSessionsMap.get(username);
    return sessions ? sessions.size : 0;
  }

  /**
   * 获取在线会话总数
   * 
   * @returns 所有WebSocket会话的总数（包含多设备）
   */
  getTotalSessionCount(): number {
    return this.sessionDetailsMap.size;
  }

  /**
   * 检查用户是否在线
   * 
   * @param username 用户名
   * @returns 是否在线（至少有一个活跃会话）
   */
  isUserOnline(username: string): boolean {
    const sessions = this.userSessionsMap.get(username);
    return sessions !== undefined && sessions.size > 0;
  }

  /**
   * 获取所有在线用户列表
   * 
   * @returns 在线用户信息列表
   */
  getOnlineUsers(): OnlineUserDto[] {
    const result: OnlineUserDto[] = [];
    this.userSessionsMap.forEach((sessions, username) => {
      // 取最早的连接时间作为登录时间
      let earliestLoginTime = Infinity;
      sessions.forEach((sessionId) => {
        const sessionInfo = this.sessionDetailsMap.get(sessionId);
        if (sessionInfo && sessionInfo.connectTime < earliestLoginTime) {
          earliestLoginTime = sessionInfo.connectTime;
        }
      });

      result.push({
        username,
        sessionCount: sessions.size,
        loginTime: earliestLoginTime === Infinity ? Date.now() : earliestLoginTime,
      });
    });
    return result;
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    this.userSessionsMap.clear();
    this.sessionDetailsMap.clear();
  }
}
