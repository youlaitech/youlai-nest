import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
  UseInterceptors,
  Delete,
} from "@nestjs/common";

import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginAuthDto } from "./dto/login-auth.dto";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LoginResponse } from "./vo/auth.vo";
import { Public } from "../common/public/public.decorator";
import { ToolsService } from "../utils/service/tools.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ApiException } from "../common/http-exception/api.exception";
import { BusinessErrorCode } from "../common/enums/business-error-code.enum";
import { v4 as uuidv4 } from "uuid";
import { RedisCacheService } from "../cache/redis_cache.service";
import { FileInterceptor } from "@nestjs/platform-express";

@ApiTags("01.认证接口")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly toolsService: ToolsService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @Inject(forwardRef(() => RedisCacheService))
    private readonly RedisService: RedisCacheService
  ) {}

  @ApiOperation({ summary: "登录接口" })
  @ApiOkResponse({ description: "登录成功返回", type: LoginResponse })
  @UseInterceptors(FileInterceptor(""))
  @Public()
  @Post("login")
  async login(@Body() loginAuthDto: LoginAuthDto) {
    try {
      const { captchaCode, captchaKey } = loginAuthDto;
      const CODE_EXPIRED_ERROR = "验证码超时";
      const code = await this.RedisService.get(captchaKey);
      if (!code) {
        throw new ApiException(CODE_EXPIRED_ERROR, BusinessErrorCode.VALIDATION_ERROR);
      }
      if (captchaCode?.toUpperCase() === code?.toUpperCase()) {
        return await this.authService.login(loginAuthDto);
      }
      throw new ApiException("验证码未通过", BusinessErrorCode.VALIDATION_ERROR);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @ApiOperation({ summary: "注销登录" })
  @Public()
  @Delete("logout")
  async logout(@Req() req: Request) {
    try {
      // // 提取 JWT Token
      const token = req.headers.authorization?.split(" ")[1];
      // 如果 Token 存在，清除 JWT Token
      if (!token) {
        // 后面用等redis 存储token
      }

      // 清除用户信息
      req["user"] = null;
      // 向客户端返回成功的响应
      return {};
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  @ApiOperation({ summary: "获取验证码" })
  @Public()
  @Get("captcha")
  async getCode() {
    // 创建验证码
    const svgCaptcha = await this.toolsService.captche();
    // 使用redis 存储
    const captchaKey = uuidv4();
    await this.RedisService.set(captchaKey, svgCaptcha.captcha.text, 75);
    return {
      captchaBase64: svgCaptcha.base64,
      captchaKey,
    };
  }
}
