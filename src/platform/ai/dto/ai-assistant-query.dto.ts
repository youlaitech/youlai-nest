import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";
import { BaseQueryDto } from "src/common/dto/base-query.dto";

export class AiAssistantQueryDto extends BaseQueryDto {
  @ApiProperty({ description: "关键字(原始命令/函数名称/用户名)", required: false })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiProperty({ description: "执行状态(0-待执行, 1-成功, -1-失败)", required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  executeStatus?: number;

  @ApiProperty({ description: "用户ID", required: false })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  userId?: string;

  @ApiProperty({ description: "解析状态(0-失败, 1-成功)", required: false })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  parseStatus?: number;

  @ApiProperty({ description: "创建时间范围 [开始, 结束]", required: false, type: [String] })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      const filtered = value.map((v) => (v === "" ? undefined : v)).filter(Boolean);
      return filtered.length ? filtered : undefined;
    }
    if (value === "" || value === undefined || value === null) return undefined;
    return [value];
  })
  createTime?: string[];

  @ApiProperty({ description: "函数名称", required: false })
  @IsOptional()
  @IsString()
  functionName?: string;

  @ApiProperty({ description: "AI供应商", required: false })
  @IsOptional()
  @IsString()
  aiProvider?: string;

  @ApiProperty({ description: "AI模型", required: false })
  @IsOptional()
  @IsString()
  aiModel?: string;
}
