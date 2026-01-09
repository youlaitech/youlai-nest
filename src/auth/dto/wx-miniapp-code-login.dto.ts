import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class WxMiniAppCodeLoginDto {
  @ApiProperty({ description: "登录 code" })
  @IsNotEmpty()
  @IsString()
  code: string;
}
