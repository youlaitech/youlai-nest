import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { RedisCacheService } from "src/shared/cache/redis_cache.service";

/**
 * JWT 认证策略
 *
 * 解析并验证 JWT 令牌
 * 将令牌载荷转换为标准化的用户对象
 * 处理令牌过期、签名有效性等底层验证
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisCacheService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Authorization Header 提取 Bearer Token
      ignoreExpiration: false, // 是否忽略令牌过期
      secretOrKey: configService.get("JWT_SECRET_KEY"), // 用于验证签名的密钥
    });
  }

  /**
   * 验证并标准化 JWT 载荷
   *
   * @param payload 解码后的 JWT 载荷
   * @returns 标准用户对象 (将挂载到 req.user)
   */
  async validate(payload: any) {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException("无效的令牌载荷");
    }

    const userId = payload.sub;

    // 1. 校验安全版本号：用于按用户维度失效历史 Token
    const tokenVersion: number = payload.securityVersion ?? 0;
    const versionKey = `auth:user:security_version:${userId}`;
    const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
    const currentVersion = currentVersionRaw ?? 0;

    if (tokenVersion < currentVersion) {
      throw new UnauthorizedException("Token 已失效，请重新登录");
    }

    // 2. 校验黑名单：用于精确作废指定 Token
    const jti: string | undefined = payload.jti;
    if (jti) {
      const blacklistKey = `auth:token:blacklist:${jti}`;
      const inBlacklist = await this.redisCacheService.hasKey(blacklistKey);
      if (inBlacklist) {
        throw new UnauthorizedException("Token 已失效，请重新登录");
      }
    }

    return {
      userId,
      username: payload.username,
      roles: payload.roles || [],
      deptId: payload.deptId,
      dataScope: payload.dataScope,
    };
  }
}
