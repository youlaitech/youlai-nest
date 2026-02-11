import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Inject,
  forwardRef,
  Delete,
} from "@nestjs/common";

import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LoginResultDto } from "./dto/login-result.dto";
import { Public } from "../common/decorators/public.decorator";
import { ToolsService } from "../common/utils/service/tools.service";
import { BusinessException } from "../common/exceptions/business.exception";
import { v4 as uuidv4 } from "uuid";
import { RedisService } from "../shared/redis/redis.service";
import { ErrorCode } from "src/common/enums/error-code.enum";

/**
 * 认证接口控制器
 */
@ApiTags("01.认证接口")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly toolsService: ToolsService,
    @Inject(forwardRef(() => RedisService))
    private readonly RedisService: RedisService
  ) {}

  @ApiOperation({ summary: "登录接口" })
  @ApiOkResponse({ type: LoginResultDto })
  @Public()
  @Post("login")
  async login(@Body() loginDto: LoginRequestDto) {
    const { captchaCode, captchaId } = loginDto;

    // 图形验证码：captcha:image:{captchaId} -> text（短 TTL）
    const cacheCaptchaCode = await this.RedisService.get(`captcha:image:${captchaId}`);

    if (!cacheCaptchaCode) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_EXPIRED);
    }

    if (captchaCode?.toUpperCase() !== cacheCaptchaCode?.toUpperCase()) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_ERROR);
    }

    return await this.authService.login(loginDto);
  }

  @ApiOperation({ summary: "短信验证码登录" })
  @Public()
  @Post("login/sms")
  async loginBySms(@Query("mobile") mobile: string, @Query("code") code: string) {
    return await this.authService.loginBySms(mobile, code);
  }

  @ApiOperation({ summary: "发送登录短信验证码" })
  @Public()
  @Post("sms/code")
  async sendLoginVerifyCode(@Query("mobile") mobile: string) {
    await this.authService.sendSmsLoginCode(mobile);
    return null;
  }

  @ApiOperation({ summary: "注销登录" })
  @Delete("logout")
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length);
      // JWT 模式：加入黑名单；redis-token 模式：清理 Redis 中的 token 映射
      await this.authService.blacklistToken(token);
    }

    // 清除用户信息
    req["user"] = null;
    // 向客户端返回成功的响应
    return null;
  }

  @ApiOperation({ summary: "获取验证码" })
  @Public()
  @Get("captcha")
  async getCode() {
    const svgCaptcha = await this.toolsService.captche();
    const captchaId = uuidv4();
    // 与 /auth/login 配套使用，120s 过期
    await this.RedisService.set(`captcha:image:${captchaId}`, svgCaptcha.captcha.text, 120);
    return {
      captchaBase64: svgCaptcha.base64,
      captchaId,
    };
  }

  @ApiOperation({ summary: "刷新令牌" })
  @Public()
  @Post("refresh-token")
  async refreshToken(@Query("refreshToken") refreshToken: string) {
    return await this.authService.refreshToken(refreshToken);
  }
}
