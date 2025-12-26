import { Module } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { RedisModule as LiaoliaRedisModule } from "@liaoliaots/nestjs-redis";

@Module({
  imports: [LiaoliaRedisModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisSharedModule {}


