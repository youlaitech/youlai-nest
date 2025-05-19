import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

/**
 * JWT 认证策略
 *
 * 解析并验证 JWT 令牌
 * 将令牌载荷转换为标准化的用户对象
 * 处理令牌过期、签名有效性等底层验证
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
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

    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles || [],
      deptId: payload.deptId,
      deptTreePath: payload.deptTreePath,
      dataScope: payload.dataScope,
    };
  }
}
