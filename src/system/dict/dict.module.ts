import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DictService } from "./dict.service";
import { DictController } from "./dict.controller";
import { SysDict } from "./entities/sys-dict.entity";
import { SysDictItem } from "./entities/sys-dict-item.entity";
import { RedisSharedModule } from "../../common/redis/redis.module";
import { RealtimeModule } from "../../realtime/realtime.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysDict, SysDictItem]), RedisSharedModule, RealtimeModule],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
