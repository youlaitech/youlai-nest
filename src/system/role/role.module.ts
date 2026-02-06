import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoleService } from "./role.service";
import { RoleController } from "./role.controller";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { MenuModule } from "../menu/menu.module";
import { SysUserRole } from "../user/entities/sys-user-role.entity";
import { RedisSharedModule } from "src/shared/redis/redis.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SysRole, SysRoleMenu, SysUserRole]),
    forwardRef(() => MenuModule),
    RedisSharedModule,
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
