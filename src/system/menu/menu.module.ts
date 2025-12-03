import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MenuService } from "./menu.service";
import { MenuController } from "./menu.controller";
import { SysMenu } from "./entities/sys-menu.entity";
import { UserModule } from "../user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([SysMenu]), forwardRef(() => UserModule)],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
