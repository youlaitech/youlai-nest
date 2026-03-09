import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoleService } from "./role.service";
import { RolePermService } from "./role-perm.service";
import { RoleController } from "./role.controller";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { SysRoleDept } from "./entities/sys-role-dept.entity";
import { SysMenu } from "../menu/entities/sys-menu.entity";
import { SysUserRole } from "../user/entities/sys-user-role.entity";
import { RedisSharedModule } from "src/core/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SysRole, SysRoleMenu, SysRoleDept, SysUserRole, SysMenu]),
    RedisSharedModule,
  ],
  controllers: [RoleController],
  providers: [RoleService, RolePermService],
  exports: [RoleService, RolePermService],
})
export class RoleModule {}
