import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../system/user/user.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { RedisCacheModule } from "../shared/cache/redis_cache.module";
import { RedisCacheService } from "../shared/cache/redis_cache.service";
import { ToolsService } from "../common/utils/service/tools.service";

@Module({
  imports: [
    UserModule,
    RedisCacheModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get("JWT_SECRET_KEY"),
        signOptions: {
          expiresIn: config.get("JWT_EXPIRES_IN"),
          issuer: config.get("JWT_ISSUER"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisCacheService, ToolsService],
  exports: [AuthService],
})
export class AuthModule {}
