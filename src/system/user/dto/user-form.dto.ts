import { ApiProperty } from "@nestjs/swagger";

export class UserFormDto {
  @ApiProperty({ description: "用户ID" })
  id: string;

  @ApiProperty({ description: "用户名" })
  username: string;

  @ApiProperty({ description: "昵称" })
  nickname: string;

  @ApiProperty({ description: "手机号" })
  mobile: string;

  @ApiProperty({ description: "性别(1-男 2-女 0-保密)" })
  gender: number;

  @ApiProperty({ description: "头像" })
  avatar: string;

  @ApiProperty({ description: "邮箱" })
  email: string;

  @ApiProperty({ description: "状态(1-正常 0-禁用)" })
  status: number;

  @ApiProperty({ description: "部门ID" })
  deptId: string;

  @ApiProperty({ description: "角色ID集合" })
  roleIds: string[];

  @ApiProperty({ description: "微信openid" })
  openId: string | null;
}
