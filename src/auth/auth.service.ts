import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import encry from "../common/utils/crypto";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../system/user/user.service";
import type { LoginRequestDto } from "./dto/login-request.dto";
import jwtConfig from "src/config/jwt.config";
import { ConfigType } from "@nestjs/config";
import { LoginResultDto } from "./dto/login-result.dto";
import { BusinessException } from "src/common/exceptions/business.exception";
import { ErrorCode } from "src/common/enums/error-code.enum";

/**
 * 认证服务
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  /**
   * 用户登录认证
   */
  async login(loginDto: LoginRequestDto): Promise<LoginResultDto> {
    // 1. 验证用户凭证
    const userAuthInfo = await this.userService.getAuthCredentialsByUsername(loginDto.username);

    if (!userAuthInfo || userAuthInfo.password !== encry(loginDto.password, userAuthInfo.salt)) {
      throw new BusinessException(ErrorCode.USER_PASSWORD_ERROR);
    }

    // 2. 生成 JWT 载荷
    const payload = {
      sub: userAuthInfo.id,
      username: userAuthInfo.username,
      deptId: userAuthInfo.deptId,
      dataScope: userAuthInfo.dataScope,
      deptTreePath: userAuthInfo.deptTreePath,
      roles: userAuthInfo.roles,
    };

    // 3. 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.expiresIn,
    });

    return {
      accessToken,
      expiresIn: this.config.expiresIn,
      tokenType: "Bearer",
    };
  }

  /**
   * 注销登录
   */
  async logout() {
    //
    // // // 提取 JWT Token
    // const token = req.headers.authorization?.split(' ')[1];
    // // 如果 Token 存在，清除 JWT Token
    // if (!token) {
    //   //   后面用等redis 存储token
    // }
    // // 验证JWT Token是否有效
    // const decoded = this.jwtService.verify(token);
    // if (!decoded) {
    //   // return res
    //   //   .status(HttpStatus.UNAUTHORIZED)
    //   //   .json({ message: '无效的Token' });
    // }
    // // 将 Token 加入黑名单，设置其有效期与 JWT 的过期时间相同
    // const expiration = decoded.exp - Math.floor(Date.now() / 1000);
    // const redisClient = this.redisService.getClient();
    // await redisClient.set(`blacklist:${token}`, 'true', 'EX', expiration);
    //
    // // 清除用户信息
    // req['user'] = null;
    // // 向客户端返回成功的响应
    // return {};
  }
}
