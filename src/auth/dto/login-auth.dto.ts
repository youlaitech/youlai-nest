import { IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class LoginAuthDto {
  @IsNotEmpty({
    message: '用户名不能为空',
  })
  @Length(2, 30, {
    message: '用户名长度必须为2-30之间',
  })
  @ApiProperty({
    example: 'admin',
    description: '用户名',
  })
  username: string;
  @IsNotEmpty()
  @Length(5, 15, {
    message: '密码长度必须为5-15之间',
  })
  @ApiProperty({
    example: 'admin1',
    description: '密码',
  })
  password: string;
  @IsNotEmpty({
    message: '验证码不能为空',
  })
  @ApiProperty({
    example: '9099',
    description: '验证码',
  })
  captchaCode: string;
  @IsNotEmpty({
    message: '验证码key为空',
  })
  @ApiProperty({
    example: '998899',
    description: '验证码key',
  })
  captchaKey: string;
}
