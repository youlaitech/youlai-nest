import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LogService } from "./log.service";
import { LogController } from "./log.controller";
import { SysLog } from "./entities/sys-log.entity";
import { LoggingInterceptor } from "./logging.interceptor";
import { SysUser } from "../user/entities/sys-user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([SysLog, SysUser])],
  controllers: [LogController],
  providers: [
    LogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LogService],
})
export class LogModule {}
