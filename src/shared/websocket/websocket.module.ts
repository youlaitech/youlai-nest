import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WebsocketGateway } from "./websocket.gateway";
import { UserSessionRegistry } from "./user-session-registry";

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
  providers: [WebsocketGateway, UserSessionRegistry],
  exports: [WebsocketGateway, UserSessionRegistry],
})
export class WebsocketModule {}
