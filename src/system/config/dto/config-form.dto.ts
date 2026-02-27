import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

/**
 * 系统配置创建参数
 */
export class CreateConfigDto {
  @ApiProperty({ description: "配置名称", required: true })
  @IsNotEmpty({ message: "配置名称不能为空" })
  @IsString()
  @MaxLength(50, { message: "配置名称长度不能超过50个字符" })
  configName: string;

  @ApiProperty({ description: "配置键", required: true })
  @IsNotEmpty({ message: "配置键不能为空" })
  @IsString()
  @MaxLength(50, { message: "配置键长度不能超过50个字符" })
  configKey: string;

  @ApiProperty({ description: "配置值", required: true })
  @IsNotEmpty({ message: "配置值不能为空" })
  @IsString()
  @MaxLength(500, { message: "配置值长度不能超过500个字符" })
  configValue: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注长度不能超过500个字符" })
  remark?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  createBy?: string;
}

/**
 * 系统配置更新参数
 */
export class UpdateConfigDto {
  @ApiProperty({ description: "配置名称", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "配置名称长度不能超过50个字符" })
  configName?: string;

  @ApiProperty({ description: "配置键", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "配置键长度不能超过50个字符" })
  configKey?: string;

  @ApiProperty({ description: "配置值", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "配置值长度不能超过500个字符" })
  configValue?: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注长度不能超过500个字符" })
  remark?: string;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  updateBy?: string;
}
