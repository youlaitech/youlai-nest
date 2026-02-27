import { IsOptional, IsString, IsNumber, IsArray, IsEmail, ValidateIf } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

/**
 * 用户更新参数
 */
export class UpdateUserDto {
  @ApiProperty({ description: "ID" })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  id?: string;

  @ApiProperty({ description: "用户名" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: "昵称" })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)" })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  gender?: number;

  @ApiProperty({ description: "密码" })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ description: "部门ID" })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  deptId?: string;

  @ApiProperty({ description: "头像" })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: "手机号" })
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiProperty({ description: "状态(1-正常 0-禁用)" })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  status?: number;

  @ApiProperty({ description: "邮箱" })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== "")
  @IsEmail({}, { message: "邮箱格式不正确" })
  email?: string;

  @ApiProperty({ description: "角色ID集合" })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (Array.isArray(value)) return value.map((v) => String(v));
    return [String(value)];
  })
  @IsString({ each: true })
  roleIds?: string[];

  @ApiProperty({ description: "角色列表" })
  @IsOptional()
  @IsArray()
  roles?: any[];

  @ApiProperty({ description: "创建时间" })
  @IsOptional()
  createTime?: Date;

  @ApiProperty({ description: "创建人ID" })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  createBy?: string;

  @ApiProperty({ description: "更新时间" })
  @IsOptional()
  updateTime?: Date;

  @ApiProperty({ description: "更新人ID" })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null || value === "" ? undefined : String(value)
  )
  @IsString()
  updateBy?: string;

  @ApiProperty({ description: "是否删除" })
  @IsOptional()
  @IsNumber()
  isDeleted?: number;
}
