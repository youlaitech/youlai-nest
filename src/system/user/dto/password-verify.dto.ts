import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * 密码校验参数
 */
export class PasswordVerifyDto {
  @ApiProperty({ description: "当前密码" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
