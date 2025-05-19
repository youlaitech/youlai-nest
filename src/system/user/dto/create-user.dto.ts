import { IsNotEmpty, IsOptional, IsString, IsNumber, IsArray, IsEmail } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @IsNotEmpty({ message: "用户名不能为空" })
  @IsString()
  username: string;

  @IsNotEmpty({ message: "昵称不能为空" })
  @IsString()
  nickname: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)", required: false })
  @IsOptional()
  @IsNumber()
  gender?: number;

  @ApiProperty({ description: "密码" })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: "部门ID", required: false })
  @IsOptional()
  @IsNumber()
  deptId?: number;

  @ApiProperty({ description: "部门名称", required: false })
  @IsString()
  @IsOptional()
  deptName?: string;

  @ApiProperty({ description: "部门树路径" })
  deptTreePath?: string;

  @ApiProperty({ description: "头像", required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: "手机号", required: false })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ description: "状态(1-正常 0-禁用)", required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ description: "邮箱", required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: "角色ID集合", required: false })
  @IsOptional()
  @IsArray()
  roleIds?: number[];

  @ApiProperty({ description: "密码盐", required: false })
  @IsOptional()
  @IsString()
  salt?: string;

  @ApiProperty({ description: "权限标识集合", required: false })
  @IsArray()
  @IsOptional()
  perms?: string[];

  @IsOptional()
  @IsNumber()
  createBy?: number;

  @IsOptional()
  @IsNumber()
  updateBy?: number;
}
