import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

/**
 * 重置密码参数
 */
export class PasswordResetDto {
  @ApiProperty({ description: "新密码" })
  @IsString()
  password: string;
}