import { Module } from "@nestjs/common";
import { OssModule } from "src/shared/oss/oss.module";
import { FileController } from "./file.controller";

@Module({
  imports: [OssModule],
  controllers: [FileController],
})
export class FileModule {}
