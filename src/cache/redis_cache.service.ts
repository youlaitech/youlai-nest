import { Injectable } from "@nestjs/common";
import { RedisService } from "@liaoliaots/nestjs-redis";
import type { Redis } from "ioredis";

/**
 * Redis缓存服务
 */
@Injectable()
export class RedisCacheService {
  private readonly client: Redis;

  constructor(private redisService: RedisService) {
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
      // 返回实际删除的键数量（1表示存在并删除成功，0表示键不存在）
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
      // EXISTS 命令返回存在的键数量（0 或 1）
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      console.error("Redis exists check error:", err);
      return false; // 出现错误时按不存在处理
    }
  }
}
