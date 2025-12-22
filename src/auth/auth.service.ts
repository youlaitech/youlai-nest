import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";

import { JwtService } from "@nestjs/jwt";
import { v4 as uuidv4 } from "uuid";
import { UserService } from "../system/user/user.service";
import type { LoginRequestDto } from "./dto/login-request.dto";
import jwtConfig from "src/config/jwt.config";
import { ConfigType, ConfigService } from "@nestjs/config";
import { LoginResultDto } from "./dto/login-result.dto";
import { BusinessException } from "src/common/exceptions/business.exception";
import { ErrorCode } from "src/common/enums/error-code.enum";
import * as bcrypt from "bcrypt";
import { RedisService } from "src/shared/redis/redis.service";

/**
 * 认证服务
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisCacheService: RedisService,
    private readonly configService: ConfigService
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.findByUsername(username);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * 用户登录认证
   */
  async login(loginDto: LoginRequestDto): Promise<LoginResultDto> {
    try {
      const { username, password } = loginDto;
      const user = await this.validateUser(username, password);
      console.log(user);
      if (!user) {
        throw new BusinessException("用户名或密码错误");
      }

      if (user.status === 0) {
        throw new BusinessException("用户已被禁用");
      }
      const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

      // ========================
      // 模式一：JWT 会话（默认）
      // ========================
      if (sessionType === "jwt") {
        const userId = user.id;

        // 从 Redis 读取用户安全版本号（不存在时默认为 0）
        const versionKey = `auth:user:security_version:${userId}`;
        const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
        const securityVersion = currentVersionRaw ?? 0;

        const jti = uuidv4();

        const payload = {
          sub: userId,
          username: user.username,
          deptId: user.deptId,
          dataScope: user.dataScope,
          deptTreePath: user.deptTreePath,
          roles: user.roles,
          // 用户安全版本号：用于按用户维度失效历史 Token
          securityVersion,
          // 令牌唯一标识：用于黑名单
          jti,
        };

        const accessToken = await this.jwtService.signAsync(payload, {
          expiresIn: this.config.expiresIn,
        });

        return {
          accessToken,
          expiresIn: this.config.expiresIn,
          tokenType: "Bearer",
          userInfo: user,
        };
      }

      // ========================
      // 模式二：Redis 会话（redis-token）
      // ========================
      const userId = user.id;
      const accessToken = uuidv4();
      const refreshToken = uuidv4();

      const accessTtl = this.config.expiresIn; // 与 JWT accessToken 一致
      const refreshTtl = this.config.expiresIn * 10; // 简单扩大一倍或多倍，可按需调整

      const onlineUser = {
        userId: userId,
        username: user.username,
        deptId: user.deptId,
        dataScope: user.dataScope,
        roles: user.roles,
      };

      // accessToken -> 用户信息
      await this.redisCacheService.set(`auth:token:access:${accessToken}`, onlineUser, accessTtl);
      // refreshToken -> 用户信息
      await this.redisCacheService.set(
        `auth:token:refresh:${refreshToken}`,
        onlineUser,
        refreshTtl
      );
      // userId -> accessToken
      await this.redisCacheService.set(`auth:user:access:${userId}`, accessToken, accessTtl);
      // userId -> refreshToken
      await this.redisCacheService.set(`auth:user:refresh:${userId}`, refreshToken, refreshTtl);

      return {
        accessToken,
        refreshToken,
        expiresIn: accessTtl,
        tokenType: "Bearer",
        userInfo: user,
      };
    } catch (error) {
      throw new BusinessException("登录失败");
    }
  }

  /**
   * 注销登录
   */
  async logout() {
    // 实际黑名单逻辑由 AuthController 传入原始 Bearer Token 后调用本方法完成
    return;
  }

  /**
   * 根据原始 JWT 令牌将其加入黑名单
   *
   * @param token Bearer Token 或裸 Token
   */
  async blacklistToken(token: string): Promise<void> {
    if (!token) {
      return;
    }

    // 如果带有 Bearer 前缀，先剥离
    if (token.startsWith("Bearer ")) {
      token = token.substring("Bearer ".length);
    }

    const decoded: any = this.jwtService.decode(token);
    if (!decoded) {
      return;
    }

    const jti: string | undefined = decoded["jti"];
    const exp: number | undefined = decoded["exp"]; // 秒级时间戳

    if (!jti || !exp) {
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const remaining = exp - nowSeconds;
    if (remaining <= 0) {
      return;
    }

    const blacklistKey = `auth:token:blacklist:${jti}`;
    await this.redisCacheService.set(blacklistKey, true, remaining);
  }
}
