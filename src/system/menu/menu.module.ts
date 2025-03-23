import { forwardRef, Module } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { MenuController } from "./menu.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { MenuSchema } from "./menu.schema";
import { UserModule } from "../user/user.module";
import { RoleModule } from "../role/role.module";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Menu", schema: MenuSchema }]),
    forwardRef(() => UserModule),
    forwardRef(() => RoleModule),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
