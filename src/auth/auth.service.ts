import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import encry from '../utils/crypto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Redis_cacheService } from '../cache/redis_cache.service';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => Redis_cacheService))
    private readonly RedisService: Redis_cacheService,
  ) {}
  async login(loginAuthDto: LoginAuthDto) {
    try {
      const { username, password } = loginAuthDto;
      console.log('获取到的   username', username);
      const user = await this.userService.findOne(username);

      console.log('获取到的用户信息', user);
      if (user?.password !== encry(password, user.salt)) {
        throw new HttpException('密码错误', HttpStatus.UNAUTHORIZED);
      }
      const payload = {
        username: user.username,
        sub: user._id,
        deptTreePath: user.UserDeptTreePath,
      };
      return {
        accessToken: await this.jwtService.signAsync(payload),
        tokenType: 'Bearer',
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async logout() {
    try {
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
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }
}
