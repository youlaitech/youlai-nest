import { Controller, Delete, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OssService } from "src/shared/oss/oss.service";

@ApiTags("文件接口")
@Controller("files")
export class FileController {
  constructor(private readonly ossService: OssService) {}

  @ApiOperation({ summary: "上传文件" })
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file: Express.Multer.File) {
    return await this.ossService.uploadFile(file);
  }

  @ApiOperation({ summary: "删除文件" })
  @Delete()
  async delete(@Query("filePath") filePath?: string) {
    return await this.ossService.deleteFile(filePath);
  }
}
