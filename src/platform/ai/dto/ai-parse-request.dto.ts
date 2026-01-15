import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AiParseRequestDto {
  @ApiProperty({ description: "用户输入的自然语言命令" })
  @IsString()
  command: string;

  @ApiProperty({ description: "当前页面路由（用于上下文）", required: false })
  @IsOptional()
  @IsString()
  currentRoute?: string;

  @ApiProperty({ description: "当前激活的组件名称", required: false })
  @IsOptional()
  @IsString()
  currentComponent?: string;

  @ApiProperty({ description: "额外上下文信息", required: false, type: Object })
  @IsOptional()
  context?: Record<string, any>;
}
