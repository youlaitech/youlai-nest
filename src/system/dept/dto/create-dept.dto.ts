import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn } from "class-validator";

export class CreateDeptDto {
  @IsNotEmpty()
  @IsString()
  name: string; // 部门名称

  @IsNotEmpty()
  @IsString()
  code: string; // 部门编号

  @IsOptional()
  @IsNumber()
  parentId?: number; // 父节点id

  @IsOptional()
  @IsString()
  treePath?: string; // 父节点id路径

  @IsOptional()
  @IsNumber()
  sort?: number; // 显示顺序

  @IsOptional()
  @IsNumber()
  @IsIn([0, 1], { message: "状态只能是0或1" })
  status?: number; // 状态 (1-正常 0-禁用)

  @IsOptional()
  @IsNumber()
  createBy?: number; // 创建人ID

  @IsOptional()
  @IsNumber()
  updateBy?: number; // 修改人ID

  createTime?: Date; // 创建时间
}
