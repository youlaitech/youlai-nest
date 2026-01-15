import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsOptional, IsString, ValidateNested } from "class-validator";
import { AiFunctionCallDto } from "./ai-function-call.dto";

export class AiExecuteRequestDto {
  @ApiProperty({ description: "关联的解析日志ID", required: false })
  @IsOptional()
  @IsString()
  parseLogId?: string;

  @ApiProperty({ description: "原始命令（用于审计）", required: false })
  @IsOptional()
  @IsString()
  originalCommand?: string;

  @ApiProperty({ description: "要执行的函数调用", type: AiFunctionCallDto })
  @ValidateNested()
  @Type(() => AiFunctionCallDto)
  functionCall: AiFunctionCallDto;

  @ApiProperty({ description: "确认模式：auto=自动执行, manual=需要用户确认", required: false })
  @IsOptional()
  @IsString()
  confirmMode?: string;

  @ApiProperty({ description: "用户确认标志", required: false })
  @IsOptional()
  @IsBoolean()
  userConfirmed?: boolean;

  @ApiProperty({ description: "幂等性令牌（防止重复执行）", required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiProperty({ description: "当前页面路由", required: false })
  @IsOptional()
  @IsString()
  currentRoute?: string;
}
