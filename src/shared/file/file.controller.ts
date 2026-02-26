import {
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { FileService } from "./file.service";

/**
 * 文件接口控制器
 * 提供简单的文件上传/删除功能
 */
@ApiTags("10.文件接口")
@Controller("files")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({ summary: "上传文件" })
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async upload(@UploadedFile() file: any) {
    return await this.fileService.uploadFile(file);
  }

  @ApiOperation({ summary: "删除文件" })
  @Delete()
  async delete(@Query("filePath") filePath?: string) {
    return await this.fileService.deleteFile(filePath);
  }
}
