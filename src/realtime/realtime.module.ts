import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { RedisSharedModule } from "../common/redis/redis.module";
import { RealtimeController } from "./realtime.controller";
import { RealtimeGateway } from "./realtime.gateway";
import { RealtimeService } from "./realtime.service";
import { RealtimeSessionRegistry } from "./realtime-session-registry.service";

@Module({
  imports: [
    ConfigModule,
    RedisSharedModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow<string>("jwt.secretKey"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RealtimeService, RealtimeSessionRegistry, RealtimeGateway],
  controllers: [RealtimeController],
  exports: [RealtimeService, RealtimeSessionRegistry],
})
export class RealtimeModule {}