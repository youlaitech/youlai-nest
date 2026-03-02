import { Injectable, LoggerService } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";

/**
 * 应用日志服务
 * 封装 Winston，提供统一的日志接口
 */
@Injectable()
export class AppLogger implements LoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  log(message: string, context?: string) {
    this.info(message, context);
  }

  info(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
