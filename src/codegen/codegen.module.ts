import { Module } from "@nestjs/common";
import { CodegenController } from "./codegen.controller";
import { CodegenService } from "./codegen.service";
import { MenuModule } from "../system/menu/menu.module";

@Module({
  imports: [MenuModule],
  controllers: [CodegenController],
  providers: [CodegenService],
})
export class CodegenModule {}
