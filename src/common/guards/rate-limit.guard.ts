import { Injectable, CanActivate, ExecutionContext, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { RedisService } from "../redis/redis.service";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../enums/error-code.enum";
import { RATE_LIMIT_KEY, RateLimitOptions } from "../decorators/rate-limit.decorator";
import { LoggerUtils } from "../utils/logger.utils";
import * as crypto from "crypto";

// 滑动窗口计数：ZSET 按时间戳剔除窗口外成员后统计
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
const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_SEC = 60;

interface RateLimitDefaults {
  defaultLimit?: number;
  defaultWindowSec?: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<Partial<RateLimitOptions>>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );
    // 未标注 @RateLimit 的接口直接放行
    if (!options) {
      return true;
    }

    // 装饰器未显式指定时，回退到配置默认值（RATE_LIMIT_DEFAULT_*）
    const defaults = this.configService.get<RateLimitDefaults>("rateLimit") ?? {};
    const limit = options.limit ?? defaults.defaultLimit ?? DEFAULT_LIMIT;
    const windowSec = options.windowSec ?? defaults.defaultWindowSec ?? DEFAULT_WINDOW_SEC;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const token = request.headers.authorization?.replace("Bearer ", "") || "";
    const ip = LoggerUtils.parseClientIP(request) || "unknown";
    // 限流身份：登录态取 token 摘要，匿名回退 IP
    const identity = token
      ? crypto.createHash("sha256").update(token).digest("hex")
      : ip;
    const path = request.originalUrl?.split("?")[0] || request.url;
    const key = `rate_limit:api:${identity}:${path}`;

    try {
      const now = Date.now();
      const member = crypto.randomUUID();
      const count = (await this.redisService
        .getClient()
        .eval(LUA_SLIDING_WINDOW, 1, key, now, windowSec * 1000, member)) as number;

      response.setHeader("X-RateLimit-Limit", String(limit));
      response.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit - count)));
      response.setHeader("X-RateLimit-Reset", String(Math.floor((now + windowSec * 1000) / 1000)));

      if (count > limit) {
        throw new BusinessException({
          code: ErrorCode.REQUEST_CONCURRENCY_LIMIT_EXCEEDED.code,
          msg: ErrorCode.REQUEST_CONCURRENCY_LIMIT_EXCEEDED.msg,
          httpStatus: 429,
        });
      }
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.warn("Redis 限流异常，跳过");
    }

    return true;
  }
}
