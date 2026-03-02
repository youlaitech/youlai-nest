import * as winston from "winston";
import { utilities as nestWinstonUtils } from "nest-winston";

/**
 * Winston 日志配置
 */
export const winstonConfig = {
  // 自定义日志级别，critical 最高
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5,
  },
  // 日志格式：时间戳 + 错误堆栈 + JSON
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  // 输出目标：控制台 + 文件
  transports: [
    // 控制台输出（带颜色和 NestJS 风格）
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), nestWinstonUtils.format.nestLike()),
    }),
    // 文件输出（单文件最大 5MB）
    new winston.transports.File({
      filename: "logs/app.log",
      maxsize: 1024 * 1024 * 5,
    }),
  ],
};
