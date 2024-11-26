import { HttpException, HttpStatus, Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

interface CacheOptions {
  ttl?: number;        // 缓存过期时间（秒）
  prefix?: string;     // 键前缀
  nullTtl?: number;    // 空值缓存时间（防止缓存穿透）
}

const DEFAULT_OPTIONS: CacheOptions = {
  ttl: 3600,          // 默认1小时
  prefix: 'cache:',
  nullTtl: 60         // 空值缓存1分钟
};

@Injectable()
export class Redis_cacheService implements OnModuleInit {
  constructor(
    @InjectRedis() private readonly client: Redis,
    @InjectRedis('subscriber') private readonly subscriberClient: Redis,
    @InjectRedis('publish') private readonly publishClient: Redis,
  ) {}

  async onModuleInit() {
    // 缓存预热
    await this.warmupCache();
  }

  private async warmupCache() {
    // TODO: 实现缓存预热逻辑
    // 例如：加载常用配置、字典数据等
  }

  // 批量获取缓存
  async mget(keys: string[]): Promise<any[]> {
    if (!keys.length) {
      return [];
    }
    return await this.client.mget(keys);
  }

  // 批量设置缓存
  async mset(keyValues: { [key: string]: any }, options?: CacheOptions): Promise<'OK'> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const args: string[] = [];
    
    Object.entries(keyValues).forEach(([key, value]) => {
      args.push(key, JSON.stringify(value));
    });

    if (args.length === 0) {
      return 'OK';
    }

    await this.client.mset(args);
    
    // 设置过期时间
    if (opts.ttl) {
      const pipeline = this.client.pipeline();
      Object.keys(keyValues).forEach(key => {
        pipeline.expire(key, opts.ttl);
      });
      await pipeline.exec();
    }

    return 'OK';
  }

  // 缓存设置（带防穿透）
  async setCache(key: string, value: any, options?: CacheOptions | number) {
    const opts = typeof options === 'number' 
      ? { ...DEFAULT_OPTIONS, ttl: options }
      : { ...DEFAULT_OPTIONS, ...options };
    
    const cacheKey = opts.prefix + key;
    
    // 如果值为null或undefined，使用较短的过期时间防止缓存穿透
    const ttl = value === null || value === undefined ? opts.nullTtl : opts.ttl;
    
    return await this.client.set(
      cacheKey,
      JSON.stringify({ value, timestamp: Date.now() }),
      'EX',
      ttl
    );
  }

  // 缓存获取（带防击穿）
  async getCache(key: string, fetchData?: () => Promise<any>, options?: CacheOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cacheKey = opts.prefix + key;

    // 获取缓存
    const cached = await this.client.get(cacheKey);
    
    if (cached) {
      const parsedCache = JSON.parse(cached);
      return parsedCache.value;
    }

    // 如果提供了fetchData函数，则获取新数据
    if (fetchData) {
      // 使用分布式锁防止缓存击穿
      const lockKey = `lock:${cacheKey}`;
      const locked = await this.client.setnx(lockKey, '1');
      if (locked) {
        await this.client.expire(lockKey, 10); // 10秒过期
        try {
          const newData = await fetchData();
          await this.setCache(key, newData, options);
          return newData;
        } finally {
          await this.client.del(lockKey);
        }
      } else {
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 50));
        return this.getCache(key, fetchData, options);
      }
    }

    return null;
  }

  // 删除缓存
  async delCache(key: string, options?: CacheOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const cacheKey = opts.prefix + key;
    return await this.client.del(cacheKey);
  }

  // 批量删除缓存
  async delCachePattern(pattern: string) {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      return await this.client.del(keys);
    }
    return 0;
  }

  // 设置分布式锁
  async lock(key: string, ttl: number = 30): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const locked = await this.client.setnx(lockKey, '1');
    if (locked) {
      await this.client.expire(lockKey, ttl);
    }
    return locked === 1;
  }

  // 释放分布式锁
  async unlock(key: string): Promise<number> {
    const lockKey = `lock:${key}`;
    return await this.client.del(lockKey);
  }
}
