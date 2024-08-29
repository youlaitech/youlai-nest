import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
@Injectable()
export class Redis_cacheService {
  constructor(
    @InjectRedis() private readonly client: Redis,
    @InjectRedis('subscriber') private readonly subscriberClient: Redis,
    @InjectRedis('publish') private readonly publishClient: Redis,
  ) {}
  // 存储数据
  async setCache(key: string, value: any, second: number = 30) {
    return await this.client.set(key, value, 'EX', second);
  }
//   获取数据
  async getCache(key: string) {
    if (!key.length) {
      throw new HttpException('key不能为空', HttpStatus.BAD_REQUEST);
    }

    return await this.client.get(key);
  }
}
