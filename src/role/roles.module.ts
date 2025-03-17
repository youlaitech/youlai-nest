import { forwardRef, Module } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleSchema } from "./role.schema";
import { MenuModule } from "../menu/menu.module";
const RolesTable = MongooseModule.forFeature([{ name: "Roles", schema: RoleSchema }]);
@Module({
  imports: [RolesTable, forwardRef(() => MenuModule)],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
