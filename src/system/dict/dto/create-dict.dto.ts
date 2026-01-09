import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDictDto {
  dict_code: string;
  name: string;
  remark: string;
  status: number;
}

/**
 * 字典表单 DTO
 */
export class DictFormDto {
  @ApiProperty({ description: "字典编码" })
  @IsString()
  dictCode: string;

  @ApiProperty({ description: "字典名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "状态(0:正常;1:禁用)" })
  @IsNumber()
  status: number;

  @ApiProperty({ description: "备注" })
  @IsString()
  @IsOptional()
  remark?: string;
}
