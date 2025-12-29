import { IsNotEmpty, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 登录请求
 */
export class LoginRequestDto {
  @IsNotEmpty({
    message: "用户名不能为空",
  })
  @ApiProperty({
    example: "admin",
    description: "用户名",
  })
  username: string;

  @IsNotEmpty({
    message: "密码不能为空",
  })
  @ApiProperty({
    example: "123456",
    description: "密码",
  })
  password: string;

  @IsNotEmpty({
    message: "验证码不能为空",
  })
  @ApiProperty({
    example: "9099",
    description: "验证码",
  })
  captchaCode: string;

  @IsNotEmpty({
    message: "验证码ID为空",
  })
  @ApiProperty({
    example: "998899",
    description: "验证码ID",
  })
  captchaId: string;
}
