import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/**
 * 表单定义分页查询。
 */
export class FormDefinitionQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNum?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  keywords?: string;

  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * 表单定义入参。
 */
export class CreateFormDefinitionDto {
  @IsString()
  @MaxLength(64)
  formKey: string;

  @IsString()
  @MaxLength(100)
  formName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsArray()
  formJson?: any[];

  @IsOptional()
  optionsJson?: Record<string, any>;

  @IsOptional()
  @IsInt()
  isPublic?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

/**
 * 表单定义修改入参。
 */
export class UpdateFormDefinitionDto extends CreateFormDefinitionDto {}

/**
 * 生成访问菜单入参。
 */
export class SaveFormMenuDto {
  @IsString()
  @MaxLength(50)
  menuName: string;

  @IsOptional()
  parentId?: string;

  @IsOptional()
  @IsArray()
  roleIds?: string[];
}

/**
 * AI 生成表单规则入参。
 */
export class FormAiGenerateDto {
  @IsString()
  description: string;
}
