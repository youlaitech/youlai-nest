import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RedisService } from "../redis/redis.service";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../enums/error-code.enum";
import { LoggerUtils } from "../utils/logger.utils";

const DEFAULT_IP_LIMIT = 10;
const RATE_LIMIT_WINDOW_SEC = 1;
const RATE_LIMIT_KEY_PREFIX = "rate_limiter:ip:";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(private readonly redisService: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // OPTIONS 预检请求跳过限流
    if (req.method === "OPTIONS") {
      return next();
    }

    const ip = LoggerUtils.parseClientIP(req);
    if (!ip) {
      return next();
    }

    try {
      const key = `${RATE_LIMIT_KEY_PREFIX}${ip}`;
      const count = await this.redisService.getClient().incr(key);

      if (count === 1) {
        await this.redisService.getClient().expire(key, RATE_LIMIT_WINDOW_SEC);
      }

      if (count > DEFAULT_IP_LIMIT) {
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
      this.logger.warn("Redis 限流检查异常，跳过限流");
    }

    next();
  }

}

