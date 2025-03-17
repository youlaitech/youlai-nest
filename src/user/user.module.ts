import { forwardRef, Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { userSchema } from "./user.schema";
import { RolesModule } from "../roles/roles.module";
import { MenuModule } from "../menu/menu.module";
import { DeptModule } from "../dept/dept.module";
import { Redis_cacheModule } from "../cache/redis_cache.module";

const UserTable = MongooseModule.forFeature([{ name: "Users", schema: userSchema }]);

@Module({
  imports: [
    UserTable,
    forwardRef(() => MenuModule),
    forwardRef(() => RolesModule),
    forwardRef(() => DeptModule),
    Redis_cacheModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
