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
  Res,
  UseInterceptors,
  Delete,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginResponse } from './vo/auth.vo';
import { Public } from '../common/public/public.decorator';
import { ToolsService } from '../utils/service/tools.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiException } from '../common/http-exception/api.exception';
import { ApiErrorCode } from '../common/enums/api-error-code.enum';
import { v4 as uuidv4 } from 'uuid';
import { Redis_cacheService } from '../cache/redis_cache.service';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('登录验证模块')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly toolsService: ToolsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => Redis_cacheService))
    private readonly RedisService: Redis_cacheService,
  ) {}

  @ApiOperation({
    summary: '登录接口', // 接口描述信息
  })
  @ApiOkResponse({ description: '登录成功返回', type: LoginResponse })
  @UseInterceptors(FileInterceptor(''))
  @Public()
  @Post('login')
  async login(@Body() loginAuthDto: LoginAuthDto) {
    try {
      const { captchaCode, captchaKey } = loginAuthDto;
      const CODE_EXPIRED_ERROR = '验证码超时';
      const code = await this.RedisService.getCache(captchaKey);
      if (!code) {
        throw new ApiException(CODE_EXPIRED_ERROR, ApiErrorCode.USER_EXIST);
      }
      if (captchaCode?.toUpperCase() === code?.toUpperCase()) {
        return await this.authService.login(loginAuthDto);
      }
      throw new ApiException('验证码未通过', ApiErrorCode.USER_EXIST);
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @ApiOperation({
    summary: '退出登陆', // 接口描述信息
  })
  @Public()
  @Delete('logout')
  async logout(@Req() req: Request) {
    try {
      // // 提取 JWT Token
      const token = req.headers.authorization?.split(' ')[1];
      // 如果 Token 存在，清除 JWT Token
      if (!token) {
        //   后面用等redis 存储token
      }

      // 清除用户信息
      req['user'] = null;
      // 向客户端返回成功的响应
      return {};
      // 向客户端返回成功的响应
      return {};
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }
  @ApiOperation({
    summary: '获取验证码', // 接口描述信息
  })
  @Public()
  @Get('captcha')
  async getCode() {
    const svgCaptcha = await this.toolsService.captche(); //创建验证码
    // 使用redis 存储
    const captchaKey = uuidv4();
    await this.RedisService.setCache(captchaKey, svgCaptcha.captcha.text, 75);
    return {
      captchaBase64: svgCaptcha.base64,
      captchaKey,
    };
  }
}
