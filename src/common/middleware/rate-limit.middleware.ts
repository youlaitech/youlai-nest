import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { RedisService } from "../redis/redis.service";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../enums/error-code.enum";
import { LoggerUtils } from "../utils/logger.utils";
import * as crypto from "crypto";

const LUA_SLIDING_WINDOW = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local member = ARGV[3]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window + 1000)
return redis.call('ZCARD', key)
`;

// 配置缺失时的兜底阈值（与 src/config/rate-limit.config.ts 默认值一致）
const IP_LIMIT = 1000;
const IP_WINDOW_SEC = 60;

interface IPRateLimitConfig {
  enabled?: boolean;
  limit?: number;
  windowSec?: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.method === "OPTIONS") return next();

    // IP 全局限流阈值与开关取自配置（RATE_LIMIT_IP_*）
    const ipConfig = this.configService.get<IPRateLimitConfig>("rateLimit.ip") ?? {};
    if (ipConfig.enabled === false) return next();
    const limit = ipConfig.limit ?? IP_LIMIT;
    const windowSec = ipConfig.windowSec ?? IP_WINDOW_SEC;

    // IP 全局限流：滑动窗口计数并写入 X-RateLimit-* 头
    const ip = LoggerUtils.parseClientIP(req) || "unknown";
    let ipCount = 0;
    try {
      ipCount = await this.getIPCount(ip, windowSec);
    } catch {
      // Redis 异常时放行（Fail-Open）
      ipCount = 0;
    }
    res.setHeader("X-RateLimit-Limit", limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - ipCount));
    res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + windowSec);
    if (ipCount > limit) {
      res.setHeader("Retry-After", String(windowSec));
      throw new BusinessException({
        code: ErrorCode.REQUEST_CONCURRENCY_LIMIT_EXCEEDED.code,
        msg: ErrorCode.REQUEST_CONCURRENCY_LIMIT_EXCEEDED.msg,
        httpStatus: 429,
      });
    }

    next();
  }

  private async getIPCount(ip: string, windowSec: number): Promise<number> {
    const key = `rate_limit:ip:${ip}`;
    const now = Date.now();
    const member = crypto.randomUUID();
    const count = (await this.redisService
      .getClient()
      .eval(LUA_SLIDING_WINDOW, 1, key, now, windowSec * 1000, member)) as number;
    return count;
  }
}
