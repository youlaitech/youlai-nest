import { DynamicModule, Global, Module } from "@nestjs/common";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./logger.config";
import { AppLogger } from "./logger.service";
import { LoggerMiddleware } from "./logger.middleware";

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
