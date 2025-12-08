import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { SysUser } from "./entities/sys-user.entity";
import { SysUserRole } from "./entities/sys-user-role.entity";
import { RoleModule } from "../role/role.module";
import { DeptModule } from "../dept/dept.module";
import { MenuModule } from "../menu/menu.module";
import { RedisCacheModule } from "src/shared/cache/redis_cache.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([SysUser, SysUserRole]),
    forwardRef(() => RoleModule),
    forwardRef(() => DeptModule),
    forwardRef(() => MenuModule),
    RedisCacheModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
