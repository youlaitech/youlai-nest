import { IsString, IsNumber, IsOptional } from "class-validator";

/**
 * 角色创建参数
 */
export class CreateRoleDto {
  /** 角色名称 */
  @IsString()
  readonly name: string;

  /** 角色编码 */
  @IsString()
  readonly code: string;

  /** 显示顺序 */
  @IsOptional()
  @IsNumber()
  readonly sort?: number | null;

  /** 状态(1-正常 0-禁用) */
  @IsNumber()
  readonly status: number;

  /** 数据范围 */
  @IsOptional()
  @IsNumber()
  readonly dataScope?: number | null;
}
