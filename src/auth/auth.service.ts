import { Inject, Injectable } from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { v4 as uuidv4 } from "uuid";
import { UserService } from "../system/user/user.service";
import type { LoginRequestDto } from "./dto/login-request.dto";
import jwtConfig from "../config/jwt.config";
import { ConfigType, ConfigService } from "@nestjs/config";
import { LoginResultDto } from "./dto/login-result.dto";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";
import * as bcrypt from "bcrypt";
import { RedisService } from "../common/redis/redis.service";
import { RedisConstants } from "../common/constants/redis.constants";
import { LogService } from "../system/log/log.service";
import { ActionTypeValue } from "../common/enums/action-type.enum";

/**
 * 认证服务
 *
 * 负责用户登录认证、令牌签发与刷新、登出等核心功能
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisCacheService: RedisService,
    private readonly configService: ConfigService,
    private readonly logService: LogService
  ) {}

  /**
   * 获取用户 JWT 会话缓存键
   */
  private getJwtUserSessionKey(userId: string): string {
    return `${RedisConstants.Auth.USER_JWT_SESSION}:${userId}`;
  }

  /**
   * 签发令牌
   *
   * 根据会话类型配置采用不同的令牌策略：
   * - jwt: JWT 自包含模式，用户信息存储在 Token 中
   * - redis-token: Redis 索引模式，Token 仅作为索引，用户会话存储在 Redis
   */
  private async issueTokens(user: any): Promise<LoginResultDto> {
    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

    // JWT 模式：令牌自包含用户信息
    if (sessionType === "jwt") {
      const userId = user.id;

      // Token 版本控制，用于批量失效历史 Token
      const versionKey = `${RedisConstants.Auth.USER_TOKEN_VERSION}:${userId}`;
      const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
      const tokenVersion = currentVersionRaw ?? 0;

      // 缓存用户会话（不包含 perms，权限从角色权限缓存动态获取）
      const refreshTtl = this.config.expiresIn * 10;
      await this.redisCacheService.set(
        this.getJwtUserSessionKey(userId),
        {
          userId,
          username: user.username,
          deptId: user.deptId,
          dataScopes: user.dataScopes,
          deptTreePath: user.deptTreePath,
          roles: user.roles,
        },
        refreshTtl
      );

      // 构建 JWT payload
      const jti = uuidv4();
      const payload = {
        sub: userId,
        username: user.username,
        deptId: user.deptId,
        dataScopes: user.dataScopes,
        deptTreePath: user.deptTreePath,
        roles: user.roles,
        tokenVersion,
        jti,
      };

      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: this.config.expiresIn,
      });

      const refreshToken = await this.jwtService.signAsync(
        {
          ...payload,
          refreshToken: true,
        },
        {
          expiresIn: this.config.expiresIn * 10,
        }
      );

      return {
        tokenType: "Bearer",
        accessToken,
        refreshToken,
        expiresIn: this.config.expiresIn,
      };
    }

    // Redis-Token 模式：Token 仅作为索引
    const userId = user.id;
    const accessToken = uuidv4();
    const refreshToken = uuidv4();

    const accessTtl = this.config.expiresIn;
    const refreshTtl = this.config.expiresIn * 10;

    // 用户会话（不包含 perms）
    const userSession = {
      userId: userId,
      username: user.username,
      deptId: user.deptId,
      dataScopes: user.dataScopes,
      roles: user.roles,
    };

    // 存储 access/refresh 双 Token 及 userId 反向索引
    await this.redisCacheService.set(`auth:token:access:${accessToken}`, userSession, accessTtl);
    await this.redisCacheService.set(`auth:token:refresh:${refreshToken}`, userSession, refreshTtl);
    await this.redisCacheService.set(`auth:user:access:${userId}`, accessToken, accessTtl);
    await this.redisCacheService.set(`auth:user:refresh:${userId}`, refreshToken, refreshTtl);

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
    };
  }

  /**
   * 验证用户凭证
   */
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

  /**
   * 用户登录认证
   */
  async login(loginDto: LoginRequestDto): Promise<LoginResultDto> {
    const { username, password } = loginDto;
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_PASSWORD_ERROR);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }

    const result = await this.issueTokens(user);

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

  /**
   * 发送短信登录验证码
   */
  async sendSmsLoginCode(mobile: string) {
    if (!mobile) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }
    const code = "1234";
    await this.redisCacheService.set(`captcha:sms_login:${mobile}`, code, 300);
  }

  /**
   * 短信验证码登录
   */
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
    const result = await this.issueTokens(user);

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

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }

    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

    // JWT 模式
    if (sessionType === "jwt") {
      try {
        const payload: any = await this.jwtService.verifyAsync(refreshToken, {
          secret: this.config.secretKey,
          ignoreExpiration: false,
        });

        if (!payload || payload.refreshToken !== true) {
          throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        const userId = payload.sub;

        // 校验 Token 版本
        const tokenVersion: number = payload.tokenVersion ?? 0;
        const versionKey = `${RedisConstants.Auth.USER_TOKEN_VERSION}:${userId}`;
        const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
        const currentVersion = currentVersionRaw ?? 0;
        if (tokenVersion < currentVersion) {
          throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        // 校验黑名单
        const jti: string | undefined = payload.jti;
        if (jti) {
          const blacklistKey = `${RedisConstants.Auth.TOKEN_BLACKLIST}:${jti}`;
          const inBlacklist = await this.redisCacheService.hasKey(blacklistKey);
          if (inBlacklist) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
          }
        }

        // 签发新的访问令牌
        const newJti = uuidv4();
        const newAccessToken = await this.jwtService.signAsync(
          {
            sub: payload.sub,
            username: payload.username,
            deptId: payload.deptId,
            dataScopes: payload.dataScopes,
            deptTreePath: payload.deptTreePath,
            roles: payload.roles,
            tokenVersion: tokenVersion,
            jti: newJti,
          },
          {
            expiresIn: this.config.expiresIn,
          }
        );

        return {
          tokenType: "Bearer",
          accessToken: newAccessToken,
          refreshToken,
          expiresIn: this.config.expiresIn,
        };
      } catch {
        throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
      }
    }

    // Redis-Token 模式
    const userSession = await this.redisCacheService.get<any>(`auth:token:refresh:${refreshToken}`);
    if (!userSession) {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    const accessToken = uuidv4();
    const accessTtl = this.config.expiresIn;

    await this.redisCacheService.set(`auth:token:access:${accessToken}`, userSession, accessTtl);
    await this.redisCacheService.set(
      `auth:user:access:${userSession.userId}`,
      accessToken,
      accessTtl
    );

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
    };
  }

  /**
   * 注销登录
   */
  async logout() {
    // 实际黑名单逻辑由 AuthController 传入原始 Bearer Token 后调用本方法完成
    return;
  }

  /**
   * 将 JWT 令牌加入黑名单
   *
   * @param token Bearer Token 或裸 Token
   */
  async blacklistToken(token: string): Promise<void> {
    if (!token) {
      return;
    }

    // 剥离 Bearer 前缀
    if (token.startsWith("Bearer ")) {
      token = token.substring("Bearer ".length);
    }

    const decoded: any = this.jwtService.decode(token);
    if (!decoded) {
      return;
    }

    const jti: string | undefined = decoded["jti"];
    const exp: number | undefined = decoded["exp"];

    if (!jti || !exp) {
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const remaining = exp - nowSeconds;
    if (remaining <= 0) {
      return;
    }

    const blacklistKey = `${RedisConstants.Auth.TOKEN_BLACKLIST}:${jti}`;
    await this.redisCacheService.set(blacklistKey, true, remaining);
  }
}
