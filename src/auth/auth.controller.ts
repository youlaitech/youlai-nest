import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Inject,
  forwardRef,
  Delete,
  UseInterceptors,
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
import { FileInterceptor } from "@nestjs/platform-express";

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
  @UseInterceptors(FileInterceptor(""))
  @Post("login")
  async login(@Body() loginDto: LoginRequestDto) {
    const { captchaCode, captchaKey } = loginDto;

    const cacheCaptchaCode = await this.RedisService.get(captchaKey);

    if (!cacheCaptchaCode) {
      throw new BusinessException(ErrorCode.VERIFY_CODE_EXPIRED);
    }

    if (captchaCode?.toUpperCase() !== cacheCaptchaCode?.toUpperCase()) {
      throw new BusinessException(ErrorCode.VERIFY_CODE_ERROR);
    }

    return await this.authService.login(loginDto);
  }

  @ApiOperation({ summary: "注销登录" })
  @Public()
  @Delete("logout")
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring("Bearer ".length);
      await this.authService.blacklistToken(token);
    }

    // 清除用户信息
    req["user"] = null;
    // 向客户端返回成功的响应
    return {};
  }

  @ApiOperation({ summary: "获取验证码" })
  @Public()
  @Get("captcha")
  async getCode() {
    const svgCaptcha = await this.toolsService.captche();
    const captchaKey = uuidv4();
    await this.RedisService.set(captchaKey, svgCaptcha.captcha.text, 75);
    return {
      captchaBase64: svgCaptcha.base64,
      captchaKey,
    };
  }
}
