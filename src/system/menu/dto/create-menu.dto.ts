import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, MaxLength } from "class-validator";
import { Transform } from "class-transformer";

/** 菜单创建参数 */
export class CreateMenuDto {
  @IsString()
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsNumber()
  sort?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  parentId?: string;

  /** 菜单类型: C-目录 M-菜单 B-按钮 */
  @IsString()
  @IsIn(["C", "M", "B"])
  type: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  component?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  routeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  routePath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  redirect?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  permissionType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  authSymbol?: string;

  /** 按钮权限标识 */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  perm?: string;

  @IsOptional()
  @IsNumber()
  orderWeight?: number;

  /** 目录只有一个子路由时是否始终显示 */
  @IsOptional()
  @IsNumber()
  alwaysShow?: number;

  /** 是否缓存页面 */
  @IsOptional()
  @IsNumber()
  keepAlive?: number;

  /** 是否隐藏菜单 */
  @IsOptional()
  @IsNumber()
  visible?: number;

  @IsOptional()
  @IsString()
  remark?: string;

  /** 是否新标签页打开 */
  @IsOptional()
  @IsBoolean()
  createTab?: boolean;
}
