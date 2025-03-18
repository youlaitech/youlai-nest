import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "../system/user/user.service";
import { LoginAuthDto } from "./dto/login-auth.dto";
import encry from "../utils/crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { RedisCacheService } from "../cache/redis_cache.service";
import { ApiException } from "../common/http-exception/api.exception";
import { BusinessErrorCode } from "../common/enums/business-error-code.enum";
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    @Inject(forwardRef(() => RedisCacheService))
    private readonly RedisService: RedisCacheService
  ) {}

  async login(loginAuthDto: LoginAuthDto) {
    try {
      const { username, password } = loginAuthDto;
      console.log("获取到的   username", username);
      const user = await this.userService.findOne(username);

      console.log("获取到的用户信息", user);
      if (user?.password !== encry(password, user.salt)) {
      }
      const payload = {
        username: user.username,
        sub: user._id,
        deptTreePath: user.UserDeptTreePath,
      };
      return {
        accessToken: await this.jwtService.signAsync(payload),
        tokenType: "Bearer",
      };
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async logout() {
    try {
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }
}
