import { forwardRef, Module } from "@nestjs/common";
import { RoleService } from "./role.service";
import { RoleController } from "./role.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleSchema } from "./role.schema";
import { MenuModule } from "../menu/menu.module";
const RolesTable = MongooseModule.forFeature([{ name: "Role", schema: RoleSchema }]);
@Module({
  imports: [RolesTable, forwardRef(() => MenuModule)],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
