import { Controller, Post, Get, Body, Query, Req, Delete } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LoginResultDto } from "./dto/login-result.dto";
import { Public } from "../common/decorators/auth.decorator";
import { Log } from "../common/decorators/log.decorator";
import { ActionTypeValue } from "../common/enums/action-type.enum";
import { LogModuleValue } from "../common/enums/log-module.enum";
import { RateLimit } from "../common/decorators/rate-limit.decorator";
import { CaptchaService } from "./captcha.service";
import { TokenService } from "./token.service";

/**
 * 认证接口控制器
 */
@ApiTags("01.认证中心")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly captchaService: CaptchaService,
    private readonly tokenService: TokenService
  ) {}

  @ApiOperation({ summary: "登录接口" })
  @ApiOkResponse({ type: LoginResultDto })
  @Public()
  @RateLimit({ limit: 60, windowSec: 60 })
  @Post("login")
  async login(@Body() loginDto: LoginRequestDto) {
    const { captchaCode, captchaId } = loginDto;
    await this.captchaService.verify(captchaId, captchaCode);
    return await this.authService.login(loginDto);
  }

  @ApiOperation({ summary: "短信验证码登录" })
  @Public()
  @RateLimit({ limit: 60, windowSec: 60 })
  @Post("login/sms")
  async loginBySms(@Query("mobile") mobile: string, @Query("code") code: string) {
    return await this.authService.loginBySms(mobile, code);
  }

  @ApiOperation({ summary: "发送登录短信验证码" })
  @Public()
  @RateLimit({ limit: 1, windowSec: 60 })
  @Post("sms/code")
  async sendLoginVerifyCode(@Query("mobile") mobile: string) {
    await this.authService.sendSmsLoginCode(mobile);
    return null;
  }

  @ApiOperation({ summary: "注销登录" })
  @Log(LogModuleValue.LOGIN, ActionTypeValue.LOGOUT)
  @Delete("logout")
  async logout(@Req() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length);
      // 按 jti 拉黑当前令牌，仅 JWT 模式有效；redis-token 模式令牌本身随 TTL 失效
      await this.tokenService.blacklistToken(token);
    }

    req["user"] = null;
    return null;
  }

  @ApiOperation({ summary: "获取验证码" })
  @Public()
  @Get("captcha")
  async getCode() {
    return await this.captchaService.generate();
  }

  @ApiOperation({ summary: "刷新令牌" })
  @Public()
  @Post("refresh-token")
  async refreshToken(@Query("refreshToken") refreshToken: string) {
    return await this.tokenService.refreshToken(refreshToken);
  }
}
