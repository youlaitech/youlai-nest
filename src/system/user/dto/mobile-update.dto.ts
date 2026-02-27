import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * 手机号更新参数
 */
export class MobileUpdateDto {
  @ApiProperty({ description: "手机号码" })
  @IsString()
  @IsNotEmpty()
  mobile: string;

  @ApiProperty({ description: "验证码" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "当前密码" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
