import { ApiProperty } from "@nestjs/swagger";
import { AiFunctionCallDto } from "./ai-function-call.dto";

/**
 * AI 解析响应
 */
export class AiParseResponseDto {
  @ApiProperty({ description: "解析日志ID（用于关联执行记录）", required: false })
  parseLogId?: string;

  @ApiProperty({ description: "是否成功解析" })
  success: boolean;

  @ApiProperty({ description: "解析后的函数调用列表", type: [AiFunctionCallDto] })
  functionCalls: AiFunctionCallDto[];

  @ApiProperty({ description: "AI 的理解和说明", required: false })
  explanation?: string;

  @ApiProperty({ description: "置信度 (0-1)", required: false })
  confidence?: number;

  @ApiProperty({ description: "错误信息", required: false })
  error?: string;

  @ApiProperty({ description: "原始 LLM 响应（用于调试）", required: false })
  rawResponse?: string;
}
