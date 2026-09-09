import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType, ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";

import jwtConfig from "../config/jwt.config";
import { RedisService } from "../common/redis/redis.service";
import { RedisConstants } from "../common/constants/redis.constants";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";
import type { LoginResultDto } from "./dto/login-result.dto";
import type { JwtPayload } from "./interfaces/jwt-payload.interface";

/**
 * 令牌服务：统一 JWT 与 Redis-Token 两种会话模式的签发、刷新与撤销。
 * 会话模式由 SESSION_TYPE 决定：jwt 模式令牌自包含用户信息，登出靠 jti 黑名单；
 * redis-token 模式令牌仅作索引，会话存储在 Redis。
 */
@Injectable()
export class TokenService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly redisCacheService: RedisService,
    private readonly configService: ConfigService
  ) {}

  /** 获取用户 JWT 会话缓存键 */
  private getJwtUserSessionKey(userId: string): string {
    return `${RedisConstants.Auth.USER_JWT_SESSION}:${userId}`;
  }

  /** 当前会话模式 */
  private get sessionType(): string {
    return this.configService.get<string>("SESSION_TYPE") || "jwt";
  }

  /** 签发令牌，入参为含 id/username/deptId/dataScopes/roles 的用户信息 */
  async issueTokens(user: any): Promise<LoginResultDto> {
    return this.sessionType === "jwt"
      ? this.issueJwtTokens(user)
      : this.issueRedisTokens(user);
  }

  /** 刷新访问令牌，刷新令牌本身原样返回 */
  async refreshToken(refreshToken: string): Promise<LoginResultDto> {
    if (!refreshToken) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }

    return this.sessionType === "jwt"
      ? this.refreshJwtToken(refreshToken)
      : this.refreshRedisToken(refreshToken);
  }

  /** 将令牌加入黑名单，仅 JWT 模式有效 */
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

    const remaining = exp - Math.floor(Date.now() / 1000);
    if (remaining <= 0) {
      return;
    }

    const blacklistKey = `${RedisConstants.Auth.TOKEN_BLACKLIST}:${jti}`;
    await this.redisCacheService.set(blacklistKey, true, remaining);
  }

  private async issueJwtTokens(user: any): Promise<LoginResultDto> {
    const userId = user.id;

    // 令牌版本控制，用于批量失效历史令牌
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

    const payload: JwtPayload = {
      sub: userId,
      username: user.username,
      deptId: user.deptId,
      dataScopes: user.dataScopes,
      deptTreePath: user.deptTreePath,
      roles: user.roles,
      tokenVersion,
      jti: uuidv4(),
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.expiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, refreshToken: true },
      { expiresIn: refreshTtl }
    );

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: this.config.expiresIn,
    };
  }

  private async issueRedisTokens(user: any): Promise<LoginResultDto> {
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

    // 存储 access/refresh 双令牌及 userId 反向索引
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

  private async refreshJwtToken(refreshToken: string): Promise<LoginResultDto> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.secretKey,
        ignoreExpiration: false,
      });
    } catch {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    if (!payload || payload.refreshToken !== true) {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    const userId = payload.sub;

    // 校验令牌版本
    const tokenVersion: number = payload.tokenVersion ?? 0;
    const versionKey = `${RedisConstants.Auth.USER_TOKEN_VERSION}:${userId}`;
    const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
    const currentVersion = currentVersionRaw ?? 0;
    if (tokenVersion < currentVersion) {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    // 校验黑名单
    if (payload.jti) {
      const blacklistKey = `${RedisConstants.Auth.TOKEN_BLACKLIST}:${payload.jti}`;
      if (await this.redisCacheService.hasKey(blacklistKey)) {
        throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
      }
    }

    // 显式构造载荷，避免把刷新令牌的 exp/iat 带入新令牌
    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        username: payload.username,
        deptId: payload.deptId,
        dataScopes: payload.dataScopes,
        deptTreePath: payload.deptTreePath,
        roles: payload.roles,
        tokenVersion,
        jti: uuidv4(),
      },
      { expiresIn: this.config.expiresIn }
    );

    return {
      tokenType: "Bearer",
      accessToken: newAccessToken,
      refreshToken,
      expiresIn: this.config.expiresIn,
    };
  }

  private async refreshRedisToken(refreshToken: string): Promise<LoginResultDto> {
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
}
