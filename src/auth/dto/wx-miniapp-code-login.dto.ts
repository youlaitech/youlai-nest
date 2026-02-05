import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

/**
 * 微信小程序 code 登录请求
 */
export class WxMiniAppCodeLoginDto {
  @ApiProperty({ description: "登录 code" })
  @IsNotEmpty()
  @IsString()
  code: string;
}
