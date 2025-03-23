import { IsString, IsOptional, IsNumber, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Types } from "mongoose";
import { BaseDto } from "../../../common/dto/base.dto";

export class CreateUserDto extends BaseDto {
  @ApiProperty({ description: "用户名", maxLength: 30, required: true })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: "昵称", required: false })
  @IsString()
  @IsOptional()
  nickname?: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)", required: false })
  @IsNumber()
  @IsOptional()
  gender?: number;

  @ApiProperty({ description: "密码" })
  password?: string;

  @ApiProperty({ description: "部门ID", required: false })
  @IsOptional()
  deptId?: Types.ObjectId | null;

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

  @ApiProperty({ description: "角色编码集合", required: false })
  @IsArray()
  @IsOptional()
  roleIds?: Types.ObjectId[];

  @ApiProperty({ description: "部门树路径" })
  deptTreePath?: string;
  @ApiProperty({ description: "账号部门树路径" })
  UserDeptTreePath?: string;
  @ApiProperty({ description: "密码盐", required: false })
  @IsString()
  @IsOptional()
  salt?: string;

  @ApiProperty({ description: "权限标识集合", required: false })
  @IsArray()
  @IsOptional()
  perms?: string[];
}
