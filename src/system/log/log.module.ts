import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogService } from "./log.service";
import { LogController } from "./log.controller";
import { SysLog } from "./entities/sys-log.entity";
import { LoggingInterceptor } from "./logging.interceptor";

@Module({
  imports: [TypeOrmModule.forFeature([SysLog])],
  controllers: [LogController],
  providers: [
    LogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class LogModule {}
