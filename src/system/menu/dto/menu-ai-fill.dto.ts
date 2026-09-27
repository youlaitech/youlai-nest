import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

/**
 * AI 推断菜单配置入参
 */
export class MenuAiFillDto {
  @IsString()
  @MaxLength(64)
  name: string;

  /** 菜单类型: C-目录 M-菜单 E-外链 B-按钮 */
  @IsOptional()
  @IsString()
  @IsIn(["C", "M", "E", "B"])
  type?: string;

  /** 上级菜单ID，用于参考同级菜单的命名风格 */
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  parentId?: string;
}
