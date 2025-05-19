import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoleService } from "./role.service";
import { RoleController } from "./role.controller";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { MenuModule } from "../menu/menu.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysRole, SysRoleMenu]), forwardRef(() => MenuModule)],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
