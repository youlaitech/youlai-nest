import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

/**
 * 密码修改参数
 */
export class PasswordChangeDto {
  @ApiProperty({ description: "原密码" })
  @IsString()
  oldPassword: string;

  @ApiProperty({ description: "新密码" })
  @IsString()
  newPassword: string;

  @ApiProperty({ description: "确认密码" })
  @IsString()
  confirmPassword: string;
}
