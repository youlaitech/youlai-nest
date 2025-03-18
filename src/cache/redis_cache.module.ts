import { Module } from "@nestjs/common";
import { RedisCacheService } from "./redis_cache.service";

@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
