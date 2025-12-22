import { Injectable } from "@nestjs/common";
import { RedisService as LiaoliaRedisService } from "@liaoliaots/nestjs-redis";
import type { Redis } from "ioredis";

/**
 * Redis 服务（缓存抽象，基于 ioredis）
 */
@Injectable()
export class RedisService {
  private readonly client: Redis;

  constructor(private redisService: LiaoliaRedisService) {
    this.client = this.redisService.getOrThrow();
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (err) {
      console.error("Redis set error:", err);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error("Redis get error:", err);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result === 1;
    } catch (err) {
      console.error("Redis delete error:", err);
      return false;
    }
  }

  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (err) {
      console.error("Redis bulk delete error:", err);
      return 0;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      return this.delMultiple(keys);
    } catch (err) {
      console.error("Redis pattern delete error:", err);
      return 0;
    }
  }

  async hasKey(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      console.error("Redis exists check error:", err);
      return false;
    }
  }
}


