import { Controller, Delete, Post, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { FileService } from "./file.service";

// 上传大小上限，避免超大文件全量读入内存；未配置或格式非法时按 50MB 兜底
const configuredUploadSize = Number(process.env.OSS_UPLOAD_MAX_SIZE);
const MAX_UPLOAD_SIZE =
  Number.isFinite(configuredUploadSize) && configuredUploadSize > 0
    ? configuredUploadSize
    : 50 * 1024 * 1024;

/**
 * 文件接口控制器
 */
@ApiTags("10.文件接口")
@Controller("files")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({ summary: "上传文件" })
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_SIZE } }))
  async upload(@UploadedFile() file: any) {
    return await this.fileService.uploadFile(file);
  }

  @ApiOperation({ summary: "删除文件" })
  @Delete()
  async delete(@Query("filePath") filePath?: string) {
    return await this.fileService.deleteFile(filePath);
  }
}
