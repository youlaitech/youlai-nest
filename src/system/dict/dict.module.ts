import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DictService } from "./dict.service";
import { DictController } from "./dict.controller";
import { SysDict } from "./entities/sys-dict.entity";
import { SysDictItem } from "./entities/sys-dict-item.entity";
import { RedisSharedModule } from "../../shared/redis/redis.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysDict, SysDictItem]), RedisSharedModule],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
