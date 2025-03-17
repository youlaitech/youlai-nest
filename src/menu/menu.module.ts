import { forwardRef, Module } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { MenuController } from "./menu.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { MenuSchema } from "./menu.schema";
import { UserModule } from "../user/user.module";
import { RolesModule } from "../roles/roles.module";

const MenuTable = MongooseModule.forFeature([{ name: "Menus", schema: MenuSchema }]);
@Module({
  imports: [MenuTable, forwardRef(() => UserModule), forwardRef(() => RolesModule)],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
