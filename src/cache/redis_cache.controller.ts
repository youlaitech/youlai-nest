import { Body, Controller, Post } from "@nestjs/common";
import { Redis_cacheService } from "./redis_cache.service";
import { Public } from "../common/public/public.decorator";
import { ApiTags } from "@nestjs/swagger";
@ApiTags("redis")
@Controller("cache")
export class Redis_cacheController {
  constructor(private readonly redis_cacheService: Redis_cacheService) {}
  @Post("setCaptchaValue")
  @Public()
  async setCaptchaCode(
    @Body("captchaKey") captchaKey: string,
    @Body("captchaValue") captchaValue: string
  ) {
    const response = await this.redis_cacheService.setCache(captchaKey, captchaValue);
    return response;
  }
}
