import { Transform } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

/**
 * 解析 JSON 字符串入参，非字符串原样返回。
 */
function parseJsonField(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

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
  @Transform(({ value }) => parseJsonField(value))
  @IsArray()
  formJson?: any[];

  @IsOptional()
  @Transform(({ value }) => parseJsonField(value))
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
