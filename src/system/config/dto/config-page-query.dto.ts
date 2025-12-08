import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class ConfigPageQueryDto {
  @ApiProperty({ required: false, description: "配置名称" })
  @IsOptional()
  @IsString()
  configName?: string;

  @ApiProperty({ required: false, description: "配置键" })
  @IsOptional()
  @IsString()
  configKey?: string;

  @ApiProperty({ required: true, description: "页码" })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  pageNum: number;

  @ApiProperty({ required: true, description: "每页记录数" })
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  pageSize: number;
}
