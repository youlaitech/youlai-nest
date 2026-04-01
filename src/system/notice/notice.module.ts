import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NoticeService } from "./notice.service";
import { NoticeController } from "./notice.controller";
import { SysNotice } from "./entities/sys-notice.entity";
import { SysUserNotice } from "./entities/sys-user-notice.entity";
import { SysUser } from "../user/entities/sys-user.entity";
import { SseModule } from "../../message/sse.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysNotice, SysUserNotice, SysUser]), SseModule],
  controllers: [NoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
