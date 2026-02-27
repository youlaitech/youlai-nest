import { DynamicModule, Global, Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./logger.config";
import { AppLogger } from "./logger.service";
import { LoggerMiddleware } from "./logger.middleware";

/**
 * 日志模块
 * 全局模块，提供 AppLogger 和 LoggerMiddleware
 */
@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [WinstonModule.forRoot(winstonConfig)],
      providers: [AppLogger, LoggerMiddleware],
      exports: [AppLogger, LoggerMiddleware],
    };
  }
}
