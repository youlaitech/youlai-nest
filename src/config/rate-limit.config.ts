import { registerAs } from "@nestjs/config";

/**
 * 接口限流配置，对应 .env 的 RATE_LIMIT_*
 */
export default registerAs("rateLimit", () => ({
  // 是否启用 @RateLimit 接口限流
  enabled: (process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase() !== "false",
  // 每个用户、每个接口的默认请求次数上限
  limit: Number(process.env.RATE_LIMIT_LIMIT) || 60,
  // 上述次数对应的滑动窗口（秒）
  windowSec: Number(process.env.RATE_LIMIT_WINDOW_SEC) || 60,
}));
