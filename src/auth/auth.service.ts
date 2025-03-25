import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import encry from "../utils/crypto";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../system/user/user.service";
import type { LoginAuthDto } from "./dto/login-auth.dto";
import jwtConfig from "src/config/jwt.config";
import { ConfigType } from "@nestjs/config";

@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) {}

  /**
   * 登录认证
   *
   * @param loginAuthDto
   * @returns
   */
  async login(loginAuthDto: LoginAuthDto) {
    const { username, password } = loginAuthDto;
    const userAuthInfo = await this.userService.findAuthUserByUsername(username);

    // 校验密码，假设 encry 是加密方法
    if (!userAuthInfo || userAuthInfo.password !== encry(password, userAuthInfo.salt)) {
      throw new HttpException("密码错误", HttpStatus.UNAUTHORIZED);
    }

    const payload = {
      sub: userAuthInfo.id,
      username: userAuthInfo.username,
      deptTreePath: userAuthInfo.deptTreePath,
      roles: userAuthInfo.roles,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.config.expiresIn,
    });
    return { accessToken, tokenType: "Bearer" };
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
