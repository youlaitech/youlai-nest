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
import { WxMiniAppCodeLoginDto } from "./dto/wx-miniapp-code-login.dto";
import { WxMiniAppPhoneLoginDto } from "./dto/wx-miniapp-phone-login.dto";

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

  private async issueTokens(user: any): Promise<LoginResultDto> {
    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

    // JWT
    if (sessionType === "jwt") {
      const userId = user.id;
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
        securityVersion,
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

    // redis-token
    const userId = user.id;
    const accessToken = uuidv4();
    const refreshToken = uuidv4();

    const accessTtl = this.config.expiresIn;
    const refreshTtl = this.config.expiresIn * 10;

    const onlineUser = {
      userId: userId,
      username: user.username,
      deptId: user.deptId,
      dataScope: user.dataScope,
      roles: user.roles,
    };

    await this.redisCacheService.set(`auth:token:access:${accessToken}`, onlineUser, accessTtl);
    await this.redisCacheService.set(`auth:token:refresh:${refreshToken}`, onlineUser, refreshTtl);
    await this.redisCacheService.set(`auth:user:access:${userId}`, accessToken, accessTtl);
    await this.redisCacheService.set(`auth:user:refresh:${userId}`, refreshToken, refreshTtl);

    return {
      tokenType: "Bearer",
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
    };
  }

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
    const { username, password } = loginDto;
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new BusinessException(ErrorCode.USER_PASSWORD_ERROR);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }

    return await this.issueTokens(user);
  }

  async sendSmsLoginCode(mobile: string) {
    if (!mobile) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }
    const code = "1234";
    await this.redisCacheService.set(`captcha:sms_login:${mobile}`, code, 300);
  }

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
    return await this.issueTokens(user);
  }

  async loginByWechat(code: string) {
    if (!code) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }
    const user = await this.userService.findByOpenid(code);
    if (!user) {
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    if (user.status === 0) {
      throw new BusinessException(ErrorCode.ACCOUNT_FROZEN);
    }
    return await this.issueTokens(user);
  }

  async loginByWxMiniAppCode(dto: WxMiniAppCodeLoginDto) {
    return await this.loginByWechat(dto?.code);
  }

  async loginByWxMiniAppPhone(dto: WxMiniAppPhoneLoginDto) {
    // 最小实现：优先从 encryptedData 中尝试提取手机号，否则退化为 code->openid
    const encryptedData = dto?.encryptedData;
    if (encryptedData) {
      const raw = String(encryptedData).trim();
      const m = /^\d{6,20}$/.exec(raw);
      if (m) {
        return await this.loginBySms(raw, "1234");
      }
      try {
        const obj = JSON.parse(raw);
        const mobile = obj?.phoneNumber;
        if (mobile) {
          return await this.loginBySms(String(mobile), "1234");
        }
      } catch {
        // ignore
      }
    }
    return await this.loginByWechat(dto?.code);
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new BusinessException(ErrorCode.REQUEST_REQUIRED_PARAMETER_IS_EMPTY);
    }

    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";

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

        const tokenVersion: number = payload.securityVersion ?? 0;
        const versionKey = `auth:user:security_version:${userId}`;
        const currentVersionRaw = await this.redisCacheService.get<number>(versionKey);
        const currentVersion = currentVersionRaw ?? 0;
        if (tokenVersion < currentVersion) {
          throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
        }

        const jti: string | undefined = payload.jti;
        if (jti) {
          const blacklistKey = `auth:token:blacklist:${jti}`;
          const inBlacklist = await this.redisCacheService.hasKey(blacklistKey);
          if (inBlacklist) {
            throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
          }
        }

        const newJti = uuidv4();
        const newAccessToken = await this.jwtService.signAsync(
          {
            sub: payload.sub,
            username: payload.username,
            deptId: payload.deptId,
            dataScope: payload.dataScope,
            deptTreePath: payload.deptTreePath,
            roles: payload.roles,
            securityVersion: tokenVersion,
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

    const onlineUser = await this.redisCacheService.get<any>(`auth:token:refresh:${refreshToken}`);
    if (!onlineUser) {
      throw new BusinessException(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    const accessToken = uuidv4();
    const accessTtl = this.config.expiresIn;

    await this.redisCacheService.set(`auth:token:access:${accessToken}`, onlineUser, accessTtl);
    await this.redisCacheService.set(
      `auth:user:access:${onlineUser.userId}`,
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
