import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class EmailUpdateDto {
  @ApiProperty({ description: "邮箱" })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "验证码" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: "当前密码" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
