import { Injectable, Logger } from "@nestjs/common";
import { RedisService as LiaoliaRedisService } from "@liaoliaots/nestjs-redis";
import type { Redis } from "ioredis";

/**
 * Redis 服务（缓存抽象，基于 ioredis）
 *
 * 提供常用的缓存操作方法，支持：
 * - 基础 KV 操作（set/get/del）
 * - Hash 操作（hset/hget/hdel/hmget）
 * - 模式匹配删除
 */
@Injectable()
export class RedisService {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private redisService: LiaoliaRedisService) {
    this.client = this.redisService.getOrThrow();
  }

  // ==================== 基础 KV 操作 ====================

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
      this.logger.error("Redis set error", err);
      return false;
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.error("Redis get error", err);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result === 1;
    } catch (err) {
      this.logger.error("Redis delete error", err);
      return false;
    }
  }

  async delMultiple(keys: string[]): Promise<number> {
    try {
      if (keys.length === 0) return 0;
      return await this.client.del(...keys);
    } catch (err) {
      this.logger.error("Redis bulk delete error", err);
      return 0;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      return this.delMultiple(keys);
    } catch (err) {
      this.logger.error("Redis pattern delete error", err);
      return 0;
    }
  }

  async hasKey(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (err) {
      this.logger.error("Redis exists check error", err);
      return false;
    }
  }

  // ==================== Hash 操作 ====================

  /**
   * 设置 Hash 字段值
   *
   * @param key Hash 键名
   * @param field 字段名
   * @param value 字段值（自动 JSON 序列化）
   */
  async hset(key: string, field: string, value: any): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.hset(key, field, serialized);
      return true;
    } catch (err) {
      this.logger.error("Redis hset error", err);
      return false;
    }
  }

  /**
   * 获取 Hash 字段值
   *
   * @param key Hash 键名
   * @param field 字段名
   * @returns 字段值（自动 JSON 反序列化），不存在返回 null
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    try {
      const data = await this.client.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      this.logger.error("Redis hget error", err);
      return null;
    }
  }

  /**
   * 删除 Hash 字段
   *
   * @param key Hash 键名
   * @param fields 要删除的字段名（支持多个）
   * @returns 删除的字段数量
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      if (fields.length === 0) return 0;
      return await this.client.hdel(key, ...fields);
    } catch (err) {
      this.logger.error("Redis hdel error", err);
      return 0;
    }
  }

  /**
   * 批量获取 Hash 字段值
   *
   * @param key Hash 键名
   * @param fields 字段名列表
   * @returns 字段值数组，顺序与 fields 对应，不存在的字段为 null
   */
  async hmget<T = any>(key: string, fields: string[]): Promise<(T | null)[]> {
    try {
      if (fields.length === 0) return [];
      const results = await this.client.hmget(key, ...fields);
      return results.map((data) => (data ? JSON.parse(data) : null));
    } catch (err) {
      this.logger.error("Redis hmget error", err);
      return fields.map(() => null);
    }
  }

  /**
   * 删除整个 Hash 键
   *
   * @param key Hash 键名
   */
  async delHash(key: string): Promise<boolean> {
    return this.del(key);
  }

  /**
   * 检查 Hash 字段是否存在
   *
   * @param key Hash 键名
   * @param field 字段名
   */
  async hexists(key: string, field: string): Promise<boolean> {
    try {
      const result = await this.client.hexists(key, field);
      return result === 1;
    } catch (err) {
      this.logger.error("Redis hexists error", err);
      return false;
    }
  }
}
