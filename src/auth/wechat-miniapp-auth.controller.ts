import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";

import { WechatMiniappAuthService } from "./wechat-miniapp-auth.service";
import { WechatMiniappLoginResultDto } from "./dto/wechat-miniapp-login-result.dto";
import { LoginResultDto } from "./dto/login-result.dto";

@ApiTags("13.微信小程序认证")
@Controller("api/v1/wechat/miniapp/auth")
export class WechatMiniappAuthController {
  constructor(private readonly wechatMiniappAuthService: WechatMiniappAuthService) {}

  @Post("silent-login")
  @ApiOperation({ summary: "静默登录" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  })
  async silentLogin(@Body("code") code: string): Promise<WechatMiniappLoginResultDto> {
    return this.wechatMiniappAuthService.silentLogin(code);
  }

  @Post("phone-login")
  @ApiOperation({ summary: "手机号快捷登录" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        loginCode: { type: "string" },
        phoneCode: { type: "string" },
      },
      required: ["loginCode", "phoneCode"],
    },
  })
  async phoneLogin(
    @Body("loginCode") loginCode: string,
    @Body("phoneCode") phoneCode: string
  ): Promise<LoginResultDto> {
    return this.wechatMiniappAuthService.phoneLogin(loginCode, phoneCode);
  }

  @Post("bind-mobile")
  @ApiOperation({ summary: "绑定手机号" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        openId: { type: "string" },
        mobile: { type: "string" },
        smsCode: { type: "string" },
      },
      required: ["openId", "mobile", "smsCode"],
    },
  })
  async bindMobile(
    @Body("openId") openId: string,
    @Body("mobile") mobile: string,
    @Body("smsCode") smsCode: string
  ): Promise<LoginResultDto> {
    return this.wechatMiniappAuthService.bindMobile(openId, mobile, smsCode);
  }
}
