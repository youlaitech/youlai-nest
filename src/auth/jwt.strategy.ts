import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "src/shared/redis/redis.service";
import { RoleService } from "src/system/role/role.service";
import { ROOT_ROLE_CODE } from "src/common/constants";

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
    private readonly redisCacheService: RedisService,
    private readonly roleService: RoleService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Authorization Header 提取 Bearer Token
      ignoreExpiration: false, // 是否忽略令牌过期
      secretOrKey: configService.getOrThrow<string>("jwt.secretKey"), // 用于验证签名的密钥
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

    // 校验 Token 版本号
    const tokenVersion: number = payload.tokenVersion ?? 0;
    const versionKey = `auth:user:token_version:${userId}`;
    const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
    const currentVersion = currentVersionRaw ?? 0;

    if (tokenVersion < currentVersion) {
      throw new UnauthorizedException("Token 已失效，请重新登录");
    }

    // 校验黑名单
    const jti: string | undefined = payload.jti;
    if (jti) {
      const blacklistKey = `auth:token:blacklist:${jti}`;
      const inBlacklist = await this.redisCacheService.hasKey(blacklistKey);
      if (inBlacklist) {
        throw new UnauthorizedException("Token 已失效，请重新登录");
      }
    }

    const roles: string[] = payload.roles || [];

    // 获取角色的数据权限列表
    const dataScopes = await this.roleService.getRoleDataScopes(roles);

    const userSessionKey = `auth:user:jwt_session:${userId}`;
    const cachedSession = await this.redisCacheService.get<any>(userSessionKey);

    let perms: string[] = Array.isArray(cachedSession?.perms) ? cachedSession.perms : [];
    if (perms.length === 0) {
      if (roles.includes(ROOT_ROLE_CODE)) {
        perms = await this.roleService.findAllPerms();
      } else {
        perms = await this.roleService.findPermsByRoleCodes(roles);
      }

      const expiresIn = this.configService.get<number>("jwt.expiresIn") ?? 0;
      const refreshTtl = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 10 : undefined;
      await this.redisCacheService.set(
        userSessionKey,
        {
          userId,
          username: payload.username,
          deptId: payload.deptId,
          dataScopes,
          deptTreePath: payload.deptTreePath,
          roles,
          perms,
        },
        refreshTtl
      );
    }

    return {
      userId,
      username: payload.username,
      roles,
      perms,
      deptId: payload.deptId,
      dataScopes,
      deptTreePath: payload.deptTreePath,
    };
  }
}
