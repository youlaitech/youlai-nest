import { Injectable } from "@nestjs/common";

import { UserService } from "../system/user/user.service";
import type { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResultDto } from "./dto/login-result.dto";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";
import * as bcrypt from "bcrypt";
import { RedisService } from "../common/redis/redis.service";
import { LogService } from "../system/log/log.service";
import { ActionTypeValue } from "../common/enums/action-type.enum";
import { TokenService } from "./token.service";

/**
 * 认证服务：密码/短信登录校验与登录流程编排
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly redisCacheService: RedisService,
    private readonly logService: LogService,
    private readonly tokenService: TokenService
  ) {}

  /** 验证用户凭证 */
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.getAuthCredentialsByUsername(username);
    if (!user) {
      return null;
    }
    if (await bcrypt.compare(password, user.password)) {
      const { password: _password, ...result } = user;
      return result;
    }
    return null;
  }

  /** 用户登录认证 */
  async login(loginDto: LoginRequestDto): Promise<LoginResultDto> {
    const { username, password } = loginDto;
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_PASSWORD_ERROR);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }

    const result = await this.tokenService.issueTokens(user);

    // 手动记录登录日志（Public 接口无法通过拦截器获取 userId）
    this.logService
      .saveManualLog({
        actionType: ActionTypeValue.LOGIN,
        operatorId: user.id,
        operatorName: user.username,
        requestMethod: "POST",
        requestUri: "/api/v1/auth/login",
        status: 1,
      })
      .catch(() => {});

    return result;
  }

  /** 发送短信登录验证码 */
  async sendSmsLoginCode(mobile: string) {
    if (!mobile) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }
    const code = "1234";
    await this.redisCacheService.set(`captcha:sms_login:${mobile}`, code, 300);
  }

  /** 短信验证码登录 */
  async loginBySms(mobile: string, code: string) {
    if (!mobile || !code) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }

    const cacheCode = await this.redisCacheService.get<string>(`captcha:sms_login:${mobile}`);
    if (!cacheCode) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_EXPIRED);
    }
    if (String(cacheCode).trim() !== String(code).trim()) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_ERROR);
    }

    const user = await this.userService.findByMobile(mobile);
    if (!user) {
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }
    const result = await this.tokenService.issueTokens(user);

    // 手动记录登录日志（Public 接口无法通过拦截器获取 userId）
    this.logService
      .saveManualLog({
        actionType: ActionTypeValue.LOGIN,
        operatorId: user.id,
        operatorName: user.username,
        requestMethod: "POST",
        requestUri: "/api/v1/auth/login/sms",
        status: 1,
      })
      .catch(() => {});

    return result;
  }

  /** 扫码登录换发会话令牌：按用户 ID 查认证信息并复用既有令牌签发逻辑。 */
  async loginByQr(userId: string): Promise<LoginResultDto> {
    const uid = Number(userId);
    if (isNaN(uid)) {
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    const user = await this.userService.getAuthInfoByUserId(uid);
    if (!user) {
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }
    return await this.tokenService.issueTokens(user);
  }
}
