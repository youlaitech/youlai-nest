import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PasswordVerifyDto {
  @ApiProperty({ description: "当前密码" })
  @IsString()
  @IsNotEmpty()
  password: string;
}
