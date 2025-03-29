import { ApiProperty } from "@nestjs/swagger";

/**
 * 登录响应
 */
export class LoginResultDto {
  @ApiProperty({ description: "访问令牌" })
  accessToken: string;

  @ApiProperty({ description: "令牌过期时间(秒)" })
  expiresIn: number;

  @ApiProperty({ description: "令牌类型" })
  tokenType: string;
}
