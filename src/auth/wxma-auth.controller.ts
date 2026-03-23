import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";

import { WxMaAuthService } from "./wxma-auth.service";
import { WxMaLoginResultDto } from "./dto/wxma-login-result.dto";
import { LoginResultDto } from "./dto/login-result.dto";

@ApiTags("12.微信小程序认证")
@Controller("api/v1/wxma/auth")
export class WxMaAuthController {
  constructor(private readonly wxMaAuthService: WxMaAuthService) {}

  @Post("silent-login")
  @ApiOperation({ summary: "静默登录" })
  @ApiBody({
    schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  })
  async silentLogin(@Body("code") code: string): Promise<WxMaLoginResultDto> {
    return this.wxMaAuthService.silentLogin(code);
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
    return this.wxMaAuthService.phoneLogin(loginCode, phoneCode);
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
    return this.wxMaAuthService.bindMobile(openId, mobile, smsCode);
  }
}
