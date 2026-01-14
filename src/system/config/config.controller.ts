import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ConfigService } from "./config.service";
import { ConfigQueryDto } from "./dto/config-query.dto";
import { CreateConfigDto, UpdateConfigDto } from "./dto/config-form.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("08.系统配置")
@Controller("configs")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @ApiOperation({ summary: "系统配置分页列表" })
  @Get()
  async page(@Query() query: ConfigQueryDto) {
    return await this.configService.getConfigPage(query);
  }

  @ApiOperation({ summary: "新增系统配置" })
  @Post()
  async saveConfig(
    @CurrentUser("userId") currentUserId: number,
    @Body() formData: CreateConfigDto
  ) {
    await this.configService.saveConfig({ ...formData, createBy: currentUserId.toString() });
    return { success: true };
  }

  @ApiOperation({ summary: "获取系统配置表单数据" })
  @Get(":id/form")
  async getConfigForm(@Param("id") id: string) {
    return await this.configService.getConfigFormData(id);
  }

  @ApiOperation({ summary: "刷新系统配置缓存" })
  @Put("refresh")
  async refreshCache() {
    await this.configService.refreshCache();
    return { success: true };
  }

  @ApiOperation({ summary: "修改系统配置" })
  @Put(":id")
  async updateConfig(
    @Param("id") id: string,
    @CurrentUser("userId") currentUserId: number,
    @Body() formData: UpdateConfigDto
  ) {
    await this.configService.updateConfig(id, { ...formData, updateBy: currentUserId.toString() });
    return { success: true };
  }

  @ApiOperation({ summary: "删除系统配置" })
  @Delete(":id")
  async deleteConfig(@Param("id") id: string) {
    await this.configService.deleteConfig(id);
    return { success: true };
  }
}
