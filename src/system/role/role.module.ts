import { forwardRef, Module } from "@nestjs/common";
import { RoleService } from "./role.service";
import { RoleController } from "./role.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleSchema } from "./role.schema";
import { MenuModule } from "../menu/menu.module";
@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Role", schema: RoleSchema }]),
    forwardRef(() => MenuModule),
  ],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
