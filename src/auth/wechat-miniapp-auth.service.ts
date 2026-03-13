import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

import { SysUser } from "../system/user/entities/sys-user.entity";
import { SysUserSocial, SocialPlatform } from "../system/user/entities/sys-user-social.entity";
import { WechatMiniappLoginResultDto } from "./dto/wechat-miniapp-login-result.dto";
import { LoginResultDto } from "./dto/login-result.dto";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";
import { RedisService } from "../core/redis/redis.service";
import jwtConfig from "../config/jwt.config";
import { ConfigType } from "@nestjs/config";

interface WechatSessionResponse {
  openid?: string;
  session_key?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

interface WechatPhoneResponse {
  errcode: number;
  errmsg?: string;
  phone_info?: {
    phoneNumber: string;
    purePhoneNumber: string;
    countryCode: string;
    watermark: {
      timestamp: number;
      appid: string;
    };
  };
}

interface WechatTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatMiniappAuthService {
  private readonly logger = new Logger(WechatMiniappAuthService.name);

  private readonly appId: string;
  private readonly appSecret: string;

  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfigData: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
    @InjectRepository(SysUser)
    private readonly userRepository: Repository<SysUser>,
    @InjectRepository(SysUserSocial)
    private readonly socialRepository: Repository<SysUserSocial>
  ) {
    this.appId = this.configService.get<string>("WX_MINIAPP_APP_ID") || "";
    this.appSecret = this.configService.get<string>("WX_MINIAPP_APP_SECRET") || "";
  }

  async silentLogin(code: string): Promise<WechatMiniappLoginResultDto> {
    const session = await this.getJsCodeSession(code);
    const openId = session.openid;

    if (!openId) {
      throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: "微信登录失败：无法获取用户标识" });
    }

    const social = await this.socialRepository.findOne({
      where: { platform: SocialPlatform.WECHAT_MINI, openid: openId },
    });

    if (social) {
      const token = await this.generateTokenByUserId(social.userId);
      return {
        needBindMobile: false,
        ...token,
      };
    }

    this.logger.log(`微信小程序静默登录：用户未绑定手机号，openId=${openId}`);
    return {
      needBindMobile: true,
      openId,
    };
  }

  async phoneLogin(loginCode: string, phoneCode: string): Promise<LoginResultDto> {
    const session = await this.getJsCodeSession(loginCode);
    const openId = session.openid!;

    const mobile = await this.getPhoneNumber(phoneCode);

    this.logger.log(`微信小程序手机号快捷登录：openId=${openId}, mobile=${mobile}`);

    const user = await this.findOrCreateUser(mobile);

    await this.bindWechatOpenId(user.id, openId, session.unionid, session.session_key);

    return this.generateTokenByUserId(user.id);
  }

  async bindMobile(openId: string, mobile: string, smsCode: string): Promise<LoginResultDto> {
    await this.validateSmsCode(mobile, smsCode);

    const user = await this.findOrCreateUser(mobile);

    await this.bindWechatOpenId(user.id, openId, null, null);

    this.logger.log(`微信小程序绑定手机号成功：mobile=${mobile}, openId=${openId}`);

    return this.generateTokenByUserId(user.id);
  }

  private async getJsCodeSession(code: string): Promise<WechatSessionResponse> {
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.appId}&secret=${this.appSecret}&js_code=${code}&grant_type=authorization_code`;

    try {
      const response = await axios.get<WechatSessionResponse>(url);
      const data = response.data;

      if (data.errcode && data.errcode !== 0) {
        this.logger.error(`获取微信会话信息失败：code=${code}, errcode=${data.errcode}, errmsg=${data.errmsg}`);
        throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: `微信登录失败：${data.errmsg}` });
      }

      return data;
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取微信会话信息失败：code=${code}, error=${errMsg}`);
      throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: `微信登录失败：${errMsg}` });
    }
  }

  private async getPhoneNumber(phoneCode: string): Promise<string> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}&code=${phoneCode}`;

    try {
      const response = await axios.get<WechatPhoneResponse>(url);
      const data = response.data;

      if (data.errcode !== 0) {
        this.logger.error(`获取微信手机号失败：phoneCode=${phoneCode}, errcode=${data.errcode}, errmsg=${data.errmsg}`);
        throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: `获取手机号失败：${data.errmsg}` });
      }

      return data.phone_info?.phoneNumber || "";
    } catch (error) {
      if (error instanceof BusinessException) throw error;
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取微信手机号失败：phoneCode=${phoneCode}, error=${errMsg}`);
      throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: `获取手机号失败：${errMsg}` });
    }
  }

  private async getAccessToken(): Promise<string> {
    const cacheKey = `wechat:access_token:${this.appId}`;

    const cached = await this.redisService.get<string>(cacheKey);
    if (cached) {
      return cached;
    }

    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;

    const response = await axios.get<WechatTokenResponse>(url);
    const data = response.data;

    if (data.errcode && data.errcode !== 0) {
      throw new BusinessException({ ...ErrorCode.USER_LOGIN_EXCEPTION, msg: `获取微信AccessToken失败：${data.errmsg}` });
    }

    const expiresIn = Math.max((data.expires_in || 7200) - 300, 60);
    await this.redisService.set(cacheKey, data.access_token, expiresIn);

    return data.access_token;
  }

  private async findOrCreateUser(mobile: string): Promise<SysUser> {
    const user = await this.userRepository.findOne({
      where: { mobile, isDeleted: 0 },
    });

    if (user) {
      return user;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newUser = queryRunner.manager.create(SysUser, {
        username: `wx_${uuidv4().slice(0, 8)}`,
        nickname: "微信用户",
        mobile,
        status: 1,
        isDeleted: 0,
      });
      await queryRunner.manager.save(newUser);

      // 分配 GUEST 角色（角色ID=3）
      await queryRunner.query("INSERT INTO sys_user_role (user_id, role_id) VALUES (?, ?)", [newUser.id, 3]);

      await queryRunner.commitTransaction();
      this.logger.log(`微信小程序登录：创建新用户，mobile=${mobile}, userId=${newUser.id}`);
      return newUser;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const errMsg = error instanceof Error ? error.message : String(error);
      throw new BusinessException({ ...ErrorCode.USER_ERROR, msg: `创建用户失败：${errMsg}` });
    } finally {
      await queryRunner.release();
    }
  }

  private async bindWechatOpenId(
    userId: string,
    openId: string,
    unionid?: string,
    sessionKey?: string
  ): Promise<void> {
    try {
      const existing = await this.socialRepository.findOne({
        where: { platform: SocialPlatform.WECHAT_MINI, openid: openId },
      });

      if (existing) {
        existing.userId = userId;
        existing.unionid = unionid || null;
        existing.sessionKey = sessionKey || null;
        await this.socialRepository.save(existing);
      } else {
        const social = this.socialRepository.create({
          userId,
          platform: SocialPlatform.WECHAT_MINI,
          openid: openId,
          unionid: unionid || null,
          sessionKey: sessionKey || null,
          verified: 1,
        });
        await this.socialRepository.save(social);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`绑定微信 openid 失败：userId=${userId}, openId=${openId}, error=${errMsg}`);
    }
  }

  private async validateSmsCode(mobile: string, smsCode: string): Promise<void> {
    const cacheKey = `sms:login:${mobile}`;
    const cached = await this.redisService.get<string>(cacheKey);

    if (!cached) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_EXPIRED);
    }

    if (cached !== smsCode) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_ERROR);
    }

    await this.redisService.del(cacheKey);
  }

  private async generateTokenByUserId(userId: string): Promise<LoginResultDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: 0 },
    });

    if (!user) {
      throw new BusinessException({ ...ErrorCode.USER_ERROR, msg: "用户不存在" });
    }

    const jti = uuidv4();
    const payload = {
      sub: userId,
      username: user.username,
      deptId: user.deptId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.jwtConfigData.expiresIn,
      jwtid: jti,
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: "refresh" },
      { expiresIn: this.jwtConfigData.expiresIn * 10 }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtConfigData.expiresIn,
      tokenType: "Bearer",
    };
  }
}
