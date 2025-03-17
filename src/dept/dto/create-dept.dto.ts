import { IsNotEmpty, IsOptional, IsString, IsNumber, IsMongoId, IsIn } from "class-validator";

export class CreateDeptDto {
  @IsNotEmpty()
  @IsString()
  name: string; // 部门名称

  @IsNotEmpty()
  @IsString()
  code: string; // 部门编号

  @IsOptional()
  parentId?: string | number; // 父节点id

  @IsOptional()
  deptTreePath?: string;

  @IsOptional()
  TreePath?: string; // 父节点id路径

  @IsOptional()
  @IsNumber()
  sort?: number; // 显示顺序

  @IsOptional()
  @IsNumber()
  @IsIn([0, 1], { message: "状态只能是0或1" })
  status?: number; // 状态 (1-正常 0-禁用)

  @IsOptional()
  @IsMongoId({ message: "创建人ID必须是有效的ObjectId" })
  createBy?: string; // 创建人ID

  @IsOptional()
  @IsMongoId({ message: "修改人ID必须是有效的ObjectId" })
  updateBy?: string; // 修改人ID
}
