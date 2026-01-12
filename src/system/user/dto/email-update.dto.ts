import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class EmailUpdateDto {
  @ApiProperty({ description: "邮箱" })
  @IsString()
  email: string;

  @ApiProperty({ description: "验证码" })
  @IsString()
  code: string;
}
