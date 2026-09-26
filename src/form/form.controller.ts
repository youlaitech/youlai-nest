import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Permissions, Public } from "../common/decorators/auth.decorator";
import { Log } from "../common/decorators/log.decorator";
import { ActionTypeValue } from "../common/enums/action-type.enum";
import { LogModuleValue } from "../common/enums/log-module.enum";
import {
  CreateFormDefinitionDto,
  FormAiGenerateDto,
  FormDefinitionQueryDto,
  SaveFormMenuDto,
} from "./dto/form.dto";
import { FormService } from "./form.service";

@ApiTags("12.动态表单")
@Controller("forms")
export class FormController {
  constructor(private readonly formService: FormService) {}

  @ApiOperation({ summary: "表单分页列表" })
  @Permissions("form:definition:list")
  @Get()
  async getPage(@Query() query: FormDefinitionQueryDto) {
    return await this.formService.getPage(query);
  }

  @ApiOperation({ summary: "新增表单" })
  @Permissions("form:definition:create")
  @Log(LogModuleValue.FORM, ActionTypeValue.INSERT)
  @Post()
  async create(
    @Body() dto: CreateFormDefinitionDto,
    @CurrentUser("userId") userId: string,
  ) {
    return await this.formService.create(dto, userId);
  }

  @ApiOperation({ summary: "审批表单下拉选项" })
  @Get("options")
  async options() {
    return await this.formService.workflowOptions();
  }

  @ApiOperation({ summary: "AI 生成表单规则" })
  @Permissions("form:definition:create")
  @Post("ai-generate")
  async aiGenerate(@Body() dto: FormAiGenerateDto) {
    return await this.formService.aiGenerateRule(dto.description);
  }

  @ApiOperation({ summary: "公开表单渲染规则" })
  @Public()
  @Get("public/:formKey/render")
  async publicRender(@Param("formKey") formKey: string) {
    return await this.formService.publicRender(formKey);
  }

  @ApiOperation({ summary: "公开表单提交" })
  @Public()
  @Post("public/:formKey/data")
  async publicSubmit(
    @Param("formKey") formKey: string,
    @Body() data: Record<string, any>,
  ) {
    return await this.formService.submitPublic(formKey, data, "anonymous");
  }

  @ApiOperation({ summary: "表单设计数据" })
  @Permissions("form:definition:list")
  @Get(":id/form")
  async getForm(@Param("id") id: string) {
    return await this.formService.getForm(id);
  }

  @ApiOperation({ summary: "修改表单" })
  @Permissions("form:definition:update")
  @Log(LogModuleValue.FORM, ActionTypeValue.UPDATE)
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: CreateFormDefinitionDto,
    @CurrentUser("userId") userId: string,
  ) {
    return await this.formService.update(id, dto, userId);
  }

  @ApiOperation({ summary: "删除表单" })
  @Permissions("form:definition:delete")
  @Log(LogModuleValue.FORM, ActionTypeValue.DELETE)
  @Delete(":ids")
  async remove(@Param("ids") ids: string) {
    return await this.formService.remove(ids);
  }

  @ApiOperation({ summary: "发布表单" })
  @Permissions("form:definition:update")
  @Log(LogModuleValue.FORM, ActionTypeValue.UPDATE)
  @Put(":id/publish")
  async publish(@Param("id") id: string) {
    return await this.formService.publish(id);
  }

  @ApiOperation({ summary: "停用表单" })
  @Permissions("form:definition:update")
  @Log(LogModuleValue.FORM, ActionTypeValue.UPDATE)
  @Put(":id/disable")
  async disable(@Param("id") id: string) {
    return await this.formService.disable(id);
  }

  @ApiOperation({ summary: "表单访问菜单回显" })
  @Permissions("form:definition:list")
  @Get(":id/menu")
  async getMenu(@Param("id") id: string) {
    return await this.formService.getMenu(id);
  }

  @ApiOperation({ summary: "生成表单访问菜单" })
  @Permissions("form:definition:update")
  @Log(LogModuleValue.FORM, ActionTypeValue.INSERT)
  @Post(":id/menu")
  async saveMenu(@Param("id") id: string, @Body() dto: SaveFormMenuDto) {
    return await this.formService.saveMenu(id, dto);
  }

  @ApiOperation({ summary: "表单渲染规则" })
  @Permissions("form:definition:list")
  @Get(":formKey/render")
  async render(@Param("formKey") formKey: string) {
    return await this.formService.render(formKey);
  }

  @ApiOperation({ summary: "表单数据分页" })
  @Permissions("form:data:list")
  @Get(":formKey/data")
  async dataPage(
    @Param("formKey") formKey: string,
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
  ) {
    return await this.formService.getDataPage(formKey, pageNum, pageSize);
  }

  @ApiOperation({ summary: "提交表单数据" })
  @Post(":formKey/data")
  async submitData(
    @Param("formKey") formKey: string,
    @Body() data: Record<string, any>,
    @CurrentUser("userId") userId: string,
  ) {
    return await this.formService.submit(formKey, data, userId);
  }

  @ApiOperation({ summary: "表单数据详情" })
  @Permissions("form:data:list")
  @Get(":formKey/data/:dataId")
  async dataDetail(@Param("dataId") dataId: string) {
    return await this.formService.getDataDetail(dataId);
  }

  @ApiOperation({ summary: "删除表单数据" })
  @Permissions("form:data:delete")
  @Log(LogModuleValue.FORM, ActionTypeValue.DELETE)
  @Delete(":formKey/data/:ids")
  async deleteData(@Param("ids") ids: string) {
    return await this.formService.deleteData(ids);
  }
}
