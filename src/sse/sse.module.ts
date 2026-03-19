import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { SseService } from "./sse.service";
import { SseController } from "./sse.controller";
import { SseSessionRegistry } from "./sse-session-registry";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow<string>("jwt.secretKey"),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SseService, SseSessionRegistry],
  controllers: [SseController],
  exports: [SseService, SseSessionRegistry],
})
export class SseModule {}
