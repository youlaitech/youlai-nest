import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class WxMiniAppPhoneLoginDto {
  @ApiProperty({ description: "登录 code" })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: "加密数据", required: false })
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @ApiProperty({ description: "iv", required: false })
  @IsOptional()
  @IsString()
  iv?: string;
}
