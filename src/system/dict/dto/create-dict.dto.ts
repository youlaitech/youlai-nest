import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateDictDto {
  dict_code: string;
  name: string;
  remark: string;
  status: number;
}
/**
 * 字典查询参数 DTO
 */
export class DictPageQueryDto {
  /**
   * 关键字(字典名称/编码)
   */
  @IsOptional()
  @IsString()
  keywords?: string;
  @IsOptional()
  @IsNumber()
  pageNum?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}

/**
 * 字典分页对象 DTO
 */
export class DictPageVoDto {
  /**
   * 字典ID
   */
  @IsString()
  id: string;

  /**
   * 字典名称
   */
  @IsString()
  name: string;

  /**
   * 字典编码
   */
  @IsString()
  dict_code: string;

  /**
   * 字典状态（1-启用，0-禁用）
   */
  @IsIn([0, 1])
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
