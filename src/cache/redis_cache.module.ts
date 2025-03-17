import { Module } from "@nestjs/common";
import { Redis_cacheService } from "./redis_cache.service";
import { Redis_cacheController } from "./redis_cache.controller";

@Module({
  providers: [Redis_cacheService],
  controllers: [Redis_cacheController],
  exports: [Redis_cacheService],
})
export class Redis_cacheModule {}
