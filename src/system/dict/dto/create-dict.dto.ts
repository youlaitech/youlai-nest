import { IsOptional, IsString, IsNumber, IsIn } from "class-validator";

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
  /**
   * 字典ID
   */
  @IsOptional()
  @IsString()
  id?: string;

  /**
   * 字典名称
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * 字典编码
   */
  @IsOptional()
  @IsString()
  dictCode?: string;

  /**
   * 字典状态（1-启用，0-禁用）
   */
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  /**
   * 备注
   */
  @IsOptional()
  @IsString()
  remark?: string;
}
