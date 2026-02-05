import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { BusinessException } from "src/common/exceptions/business.exception";

import { AiAssistantService } from "./ai-assistant.service";
import { AiParseRequestDto } from "./dto/ai-parse-request.dto";
import { AiExecuteRequestDto } from "./dto/ai-execute-request.dto";
import { AiAssistantQueryDto } from "./dto/ai-assistant-query.dto";

/**
 * AI 助手接口控制器
 */
@ApiTags("14.AI 助手接口")
// 提供解析、执行及记录查询接口。
@Controller("ai/assistant")
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @ApiOperation({ summary: "解析自然语言命令" })
  @Post("parse")
  async parseCommand(@Req() req: any, @Body() body: AiParseRequestDto) {
    return await this.aiAssistantService.parseCommand(body, req, req.user);
  }

  @ApiOperation({ summary: "执行已解析的命令" })
  @Post("execute")
  async executeCommand(@Req() req: any, @Body() body: AiExecuteRequestDto) {
    try {
      return await this.aiAssistantService.executeCommand(body, req, req.user);
    } catch (e: any) {
      throw new BusinessException(e?.message || "命令执行失败");
    }
  }

  @ApiOperation({ summary: "获取 AI 命令记录分页列表" })
  @Get("records")
  async getRecordPage(@Query() query: AiAssistantQueryDto) {
    return await this.aiAssistantService.getRecordPage(query);
  }
}
