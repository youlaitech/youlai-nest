import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ description: "用户名", maxLength: 64, required: true })
  @IsString()
  username: string;

  @ApiProperty({ description: "昵称", required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)", required: false })
  @IsNumber()
  @IsOptional()
  gender?: number;

  @ApiProperty({ description: "密码" })
  @IsString()
  password: string;

  @ApiProperty({ description: "部门ID", required: false })
  @IsNumber()
  @IsOptional()
  deptId?: number;

  @ApiProperty({ description: "部门名称", required: false })
  @IsString()
  @IsOptional()
  deptName?: string;

  @ApiProperty({ description: "部门树路径" })
  deptTreePath?: string;

  @ApiProperty({ description: "头像", required: false })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: "手机号", required: false })
  @IsString()
  @IsOptional()
  mobile?: string;

  @ApiProperty({ description: "状态(1-正常 0-禁用)", required: false })
  @IsNumber()
  @IsOptional()
  status?: number;

  @ApiProperty({ description: "邮箱", required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: "角色ID集合", required: false })
  @IsArray()
  @IsOptional()
  roleIds?: number[];

  @ApiProperty({ description: "密码盐", required: false })
  @IsString()
  @IsOptional()
  salt?: string;

  @ApiProperty({ description: "权限标识集合", required: false })
  @IsArray()
  @IsOptional()
  perms?: string[];
}
