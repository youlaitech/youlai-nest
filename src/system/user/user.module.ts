import { forwardRef, Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { UserSchema } from "./user.schema";
import { RoleModule } from "../role/role.module";
import { MenuModule } from "../menu/menu.module";
import { DeptModule } from "../dept/dept.module";
import { RedisCacheModule } from "../../shared/cache/redis_cache.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "User", schema: UserSchema }]),
    forwardRef(() => MenuModule),
    forwardRef(() => RoleModule),
    forwardRef(() => DeptModule),
    RedisCacheModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
