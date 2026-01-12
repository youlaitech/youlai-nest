import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class MobileUpdateDto {
  @ApiProperty({ description: "手机号码" })
  @IsString()
  mobile: string;

  @ApiProperty({ description: "验证码" })
  @IsString()
  code: string;
}
