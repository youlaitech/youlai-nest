import {
  Controller,
  Delete,
  Body,
  Get,
  Param,
  Post,
  Query,
  Res,
  SetMetadata,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { CodegenService } from "./codegen.service";
import type { GenConfigFormDto } from "./dto/gen-config-form.dto";
import { TableQueryDto } from "./dto/table-query.dto";

/**
 * 代码生成接口控制器
 */
@ApiTags("12.代码生成")
@Controller("codegen")
export class CodegenController {
  constructor(private readonly codegenService: CodegenService) {}

  @ApiOperation({ summary: "获取数据表分页列表" })
  @Get("table")
  async getTablePage(@Query() query: TableQueryDto) {
    return await this.codegenService.getTablePage(query);
  }

  @ApiOperation({ summary: "获取代码生成配置" })
  @Get(":tableName/config")
  async getGenConfig(@Param("tableName") tableName: string) {
    return await this.codegenService.getGenConfig(tableName);
  }

  @ApiOperation({ summary: "保存代码生成配置" })
  @Post(":tableName/config")
  async saveGenConfig(@Param("tableName") tableName: string, @Body() body: GenConfigFormDto) {
    return await this.codegenService.saveGenConfig(tableName, body);
  }

  @ApiOperation({ summary: "删除代码生成配置" })
  @Delete(":tableName/config")
  async deleteGenConfig(@Param("tableName") tableName: string) {
    return await this.codegenService.deleteGenConfig(tableName);
  }

  @ApiOperation({ summary: "获取预览生成代码" })
  @Get(":tableName/preview")
  async getPreview(
    @Param("tableName") tableName: string,
    @Query("pageType") pageType?: "classic" | "curd",
    @Query("type") type?: "ts" | "js"
  ) {
    return await this.codegenService.getPreview(tableName, pageType, type);
  }

  @ApiOperation({ summary: "下载代码" })
  @Get(":tableName/download")
  @SetMetadata("skipResponseTransform", true)
  async download(
    @Res() res: Response,
    @Param("tableName") tableName: string,
    @Query("pageType") pageType?: "classic" | "curd",
    @Query("type") type?: "ts" | "js"
  ) {
    const tableNames = tableName.split(",").filter(Boolean);
    const { fileName, buffer } = await this.codegenService.downloadZip(tableNames, pageType, type);

    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(fileName)}`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buffer);
  }
}
