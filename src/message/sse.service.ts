import { Injectable, Logger } from "@nestjs/common";
import { SseSessionRegistry } from "./sse-session-registry.service";
import { Observable, Subject } from "rxjs";

export const SSE_TOPICS = {
  DICT: "dict",
  ONLINE_COUNT: "online-count",
  SYSTEM: "system",
} as const;

interface DictChangeEvent {
  dictCode: string;
  timestamp: number;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly eventSubject = new Subject<{ eventName: string; data: any; username?: string }>();

  constructor(private readonly sessionRegistry: SseSessionRegistry) {}

  createConnection(username: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const emitter = {
        send: (eventName: string, data: any) => {
          subscriber.next({ data: JSON.stringify({ eventName, data }) } as MessageEvent);
        },
        complete: () => {
          subscriber.complete();
        },
      };

      this.sessionRegistry.userConnected(username, emitter as any);
      this.logger.debug(`SSE connection established: username=${username}`);

      // 发送初始在线人数
      this.sendOnlineCount();

      return () => {
        this.sessionRegistry.removeEmitter(emitter as any);
        this.logger.debug(`SSE connection closed: username=${username}`);
        this.sendOnlineCount();
      };
    });
  }

  sendDictChange(dictCode: string): void {
    const event: DictChangeEvent = {
      dictCode,
      timestamp: Date.now(),
    };
    this.broadcast(SSE_TOPICS.DICT, event);
    this.logger.debug(`Dict change event sent: dictCode=${dictCode}`);
  }

  sendOnlineCount(): void {
    const count = this.sessionRegistry.getOnlineUserCount();
    this.broadcast(SSE_TOPICS.ONLINE_COUNT, count);
  }

  sendToUser(username: string, eventName: string, data: any): void {
    const emitters = this.sessionRegistry.getUserEmitters(username);
    if (emitters) {
      emitters.forEach((emitter: any) => {
        try {
          emitter.send(eventName, data);
        } catch (e) {
          this.logger.warn(`Failed to send event to user: ${username}`);
          this.sessionRegistry.removeEmitter(emitter);
        }
      });
    }
    this.logger.debug(`Event sent to user: username=${username} event=${eventName}`);
  }

  getOnlineUsers() {
    return this.sessionRegistry.getOnlineUsers();
  }

  getOnlineUserCount(): number {
    return this.sessionRegistry.getOnlineUserCount();
  }

  sendSystemMessage(message: string): void {
    const systemMessage = {
      sender: "系统通知",
      content: message,
      timestamp: Date.now(),
    };
    this.broadcast(SSE_TOPICS.SYSTEM, systemMessage);
    this.logger.debug(`System message sent: ${message}`);
  }

  private broadcast(eventName: string, data: any): void {
    const emitters = this.sessionRegistry.getAllEmitters();
    emitters.forEach((emitter: any) => {
      try {
        emitter.send(eventName, data);
      } catch (e) {
        this.sessionRegistry.removeEmitter(emitter);
      }
    });
  }
}
