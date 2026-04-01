import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { RedisService } from "../../common/redis/redis.service";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/enums/error-code.enum";

/**
 * Redis 会话模式下的认证守卫
 *
 * - 从 Authorization: Bearer <accessToken> 中获取访问令牌
 * - 使用 Redis 映射 auth:token:access:{accessToken} -> UserSession
 * - 未命中则视为未登录
 */
@Injectable()
export class RedisTokenAuthGuard implements CanActivate {
  constructor(private readonly redisCacheService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_INVALID);
    }

    const accessToken = authHeader.substring("Bearer ".length);
    const userSession = await this.redisCacheService.get<any>(`auth:token:access:${accessToken}`);

    if (!userSession) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_INVALID);
    }

    // 挂载到 request.user，供后续控制器 / 守卫使用
    request.user = userSession;
    return true;
  }
}
