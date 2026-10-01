import { registerAs } from "@nestjs/config";

/**
 * 接口限流配置，对应 .env 的 RATE_LIMIT_*
 * - ip：IP 全局限流（RateLimitMiddleware）
 * - default*：接口级 @RateLimit 未显式指定时的默认阈值（RateLimitGuard）
 */
export default registerAs("rateLimit", () => ({
  ip: {
    // 是否启用 IP 全局限流（默认开启，与其它后端 rate-limit.ip.enabled 一致）
    enabled: (process.env.RATE_LIMIT_IP_ENABLED ?? "true").toLowerCase() !== "false",
    // 窗口内允许的最大请求数
    limit: Number(process.env.RATE_LIMIT_IP_LIMIT) || 1000,
    // 滑动窗口大小（秒）
    windowSec: Number(process.env.RATE_LIMIT_IP_WINDOW_SEC) || 60,
  },
  defaultLimit: Number(process.env.RATE_LIMIT_DEFAULT_LIMIT) || 60,
  defaultWindowSec: Number(process.env.RATE_LIMIT_DEFAULT_WINDOW_SEC) || 60,
}));
