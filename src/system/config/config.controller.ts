import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Log } from "src/common/decorators/log.decorator";
import { ActionTypeValue } from "src/system/log/action-type.enum";
import { LogModuleValue } from "src/system/log/log-module.enum";
import { ConfigService } from "./config.service";
import { ConfigQueryDto } from "./dto/config-query.dto";
import { CreateConfigDto, UpdateConfigDto } from "./dto/config-form.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

/**
 * 系统配置接口控制器
 */
@ApiTags("07.系统配置")
@Controller("configs")
export class ConfigController {
  private readonly configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  @ApiOperation({ summary: "系统配置分页列表" })
  @Get()
  async page(@Query() query: ConfigQueryDto) {
    return await this.configService.getConfigPage(query);
  }

  @ApiOperation({ summary: "新增系统配置" })
  @Post()
  async saveConfig(
    @CurrentUser("userId") currentUserId: string,
    @Body() formData: CreateConfigDto
  ) {
    await this.configService.saveConfig({ ...formData, createBy: currentUserId });
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
  @Log(LogModuleValue.CONFIG, ActionTypeValue.UPDATE)
  @Put(":id")
  async updateConfig(
    @Param("id") id: string,
    @CurrentUser("userId") currentUserId: string,
    @Body() formData: UpdateConfigDto
  ) {
    await this.configService.updateConfig(id, { ...formData, updateBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "删除系统配置" })
  @Log(LogModuleValue.CONFIG, ActionTypeValue.DELETE)
  @Delete(":id")
  async deleteConfig(@Param("id") id: string) {
    await this.configService.deleteConfig(id);
    return { success: true };
  }
}
