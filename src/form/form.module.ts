import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RedisSharedModule } from "../common/redis/redis.module";
import { SysMenu } from "../system/menu/entities/sys-menu.entity";
import { FormData, FormDefinition, FormSnapshot } from "./entities/form.entity";
import { FormController } from "./form.controller";
import { FormService } from "./form.service";

/**
 * 动态表单模块（表单定义、渲染、数据、访问菜单生成、AI 生成）。
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([FormDefinition, FormData, FormSnapshot, SysMenu]),
    RedisSharedModule,
  ],
  controllers: [FormController],
  providers: [FormService],
  exports: [FormService],
})
export class FormModule {}
