import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { OnlineUserDto } from "../auth/interfaces/user-session.interface";

interface SessionInfo {
  username: string;
  connectTime: number;
}

@Injectable()
export class SseSessionRegistry implements OnModuleDestroy {
  private readonly userEmittersMap: Map<string, Set<any>> = new Map();
  private readonly emitterUserMap: Map<any, SessionInfo> = new Map();

  userConnected(username: string, emitter: any): void {
    if (!this.userEmittersMap.has(username)) {
      this.userEmittersMap.set(username, new Set());
    }
    this.userEmittersMap.get(username)!.add(emitter);
    this.emitterUserMap.set(emitter, {
      username,
      connectTime: Date.now(),
    });
  }

  userDisconnected(username: string): void {
    const emitters = this.userEmittersMap.get(username);
    if (emitters) {
      emitters.forEach((emitter) => {
        this.emitterUserMap.delete(emitter);
      });
    }
    this.userEmittersMap.delete(username);
  }

  removeEmitter(emitter: any): void {
    const sessionInfo = this.emitterUserMap.get(emitter);
    if (!sessionInfo) {
      return;
    }

    this.emitterUserMap.delete(emitter);
    const emitters = this.userEmittersMap.get(sessionInfo.username);
    if (emitters) {
      emitters.delete(emitter);
      if (emitters.size === 0) {
        this.userEmittersMap.delete(sessionInfo.username);
      }
    }
  }

  getOnlineUserCount(): number {
    return this.userEmittersMap.size;
  }

  getTotalConnectionCount(): number {
    return this.emitterUserMap.size;
  }

  isUserOnline(username: string): boolean {
    const emitters = this.userEmittersMap.get(username);
    return emitters !== undefined && emitters.size > 0;
  }

  getOnlineUsers(): OnlineUserDto[] {
    const result: OnlineUserDto[] = [];
    this.userEmittersMap.forEach((emitters, username) => {
      let earliestLoginTime = Infinity;
      emitters.forEach((emitter) => {
        const sessionInfo = this.emitterUserMap.get(emitter);
        if (sessionInfo && sessionInfo.connectTime < earliestLoginTime) {
          earliestLoginTime = sessionInfo.connectTime;
        }
      });

      result.push({
        username,
        sessionCount: emitters.size,
        loginTime: earliestLoginTime === Infinity ? Date.now() : earliestLoginTime,
      });
    });
    return result;
  }

  getAllEmitters(): Set<any> {
    return new Set(this.emitterUserMap.keys());
  }

  getUserEmitters(username: string): Set<any> | undefined {
    return this.userEmittersMap.get(username);
  }

  onModuleDestroy() {
    // 主动关闭所有 SSE 连接的 HTTP 响应
    this.emitterUserMap.forEach((sessionInfo, emitter) => {
      try {
        if (emitter.complete) {
          emitter.complete();
        }
      } catch (_e) {}
    });
    this.userEmittersMap.clear();
    this.emitterUserMap.clear();
  }
}
