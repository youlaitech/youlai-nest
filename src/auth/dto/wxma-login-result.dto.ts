import { ApiProperty } from "@nestjs/swagger";

/**
 * 微信小程序登录结果
 */
export class WxMaLoginResultDto {
  @ApiProperty({ description: "是否需要绑定手机号" })
  needBindMobile: boolean;

  @ApiProperty({ description: "访问令牌", required: false })
  accessToken?: string;

  @ApiProperty({ description: "刷新令牌", required: false })
  refreshToken?: string;

  @ApiProperty({ description: "令牌过期时间(秒)", required: false })
  expiresIn?: number;

  @ApiProperty({ description: "令牌类型", required: false })
  tokenType?: string;

  @ApiProperty({ description: "微信openid（绑定手机号时使用）", required: false })
  openId?: string;
}
