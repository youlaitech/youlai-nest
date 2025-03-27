import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "../../config/jwt.config";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

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
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Authorization Header 提取 Bearer Token
      secretOrKey: config.secretKey, // 用于验证签名的密钥
      issuer: config.issuer, // 令牌签发者
      ignoreExpiration: false, // 是否忽略令牌过期
    });
  }

  /**
   * 验证并标准化 JWT 载荷
   *
   * @param payload 解码后的 JWT 载荷
   * @returns 标准用户对象 (将挂载到 req.user)
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.username) {
      throw new UnauthorizedException("无效的令牌载荷");
    }

    return {
      userId: payload.sub,
      username: payload.username,
      roles: payload.roles || [],
      dataScope: payload.dataScope,
    };
  }
}
