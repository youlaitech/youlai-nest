import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../user/user.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService, ConfigModule } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { Redis_cacheModule } from "../cache/redis_cache.module";
import { Redis_cacheService } from "../cache/redis_cache.service";
import { ToolsService } from "../utils/service/tools.service";

@Module({
  imports: [
    UserModule,
    Redis_cacheModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN", "24h"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, Redis_cacheService, ToolsService],
  exports: [AuthService],
})
export class AuthModule {}
