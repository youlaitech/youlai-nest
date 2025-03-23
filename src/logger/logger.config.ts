import * as winston from "winston";
import { utilities as nestWinstonUtils } from "nest-winston";

export const winstonConfig = {
  levels: {
    critical: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    verbose: 5,
  },
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), nestWinstonUtils.format.nestLike()),
    }),
    new winston.transports.File({
      filename: "logs/app.log",
      maxsize: 1024 * 1024 * 5, // 5MB
    }),
  ],
};
