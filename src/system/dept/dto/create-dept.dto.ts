import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn } from "class-validator";
import { Transform } from "class-transformer";

/**
 * 部门创建参数
 */
export class CreateDeptDto {
  @IsNotEmpty()
  @IsString()
  name: string; // 部门名称

  @IsNotEmpty()
  @IsString()
  code: string; // 部门编号

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  parentId?: string; // 父节点id

  @IsOptional()
  @IsString()
  treePath?: string; // 父节点id路径

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  sort?: number; // 显示顺序

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @IsIn([0, 1], { message: "状态只能是0或1" })
  status?: number; // 状态 (1-正常 0-禁用)

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  createBy?: string; // 创建人ID

  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  updateBy?: string; // 修改人ID

  createTime?: Date; // 创建时间
}
