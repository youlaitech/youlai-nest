import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";
import { RoleModule } from "../role/role.module";
import { DeptModule } from "../dept/dept.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SysUser, SysUserRole]),
    forwardRef(() => RoleModule),
    forwardRef(() => DeptModule),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
