import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NoticeService } from "./notice.service";
import { NoticeController } from "./notice.controller";
import { SysNotice } from "./entities/sys-notice.entity";
import { SysUserNotice } from "./entities/sys-user-notice.entity";
import { SysUser } from "../user/entities/sys-user.entity";
import { WebsocketModule } from "src/shared/websocket/websocket.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysNotice, SysUserNotice, SysUser]), WebsocketModule],
  controllers: [NoticeController],
  providers: [NoticeService],
  exports: [NoticeService],
})
export class NoticeModule {}
