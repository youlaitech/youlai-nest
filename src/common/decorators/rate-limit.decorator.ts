import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate-limit";

export interface RateLimitOptions {
  /** 时间窗口内允许的最大请求数 */
  limit: number;
  /** 时间窗口（秒） */
  windowSec: number;
}

/** 接口限流装饰器；未指定的 limit / windowSec 回退到 RATE_LIMIT_DEFAULT_* 配置 */
export const RateLimit = (options: Partial<RateLimitOptions> = {}) =>
  SetMetadata(RATE_LIMIT_KEY, options);
