import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserModule } from "../system/user/user.module";
import { RoleModule } from "../system/role/role.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { RedisSharedModule } from "../shared/redis/redis.module";
import { RedisService } from "../shared/redis/redis.service";
import { ToolsService } from "../common/utils/service/tools.service";

@Module({
  imports: [
    UserModule,
    RoleModule,
    RedisSharedModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.getOrThrow<string>("jwt.secretKey"),
        signOptions: {
          expiresIn: config.get<number>("jwt.expiresIn"),
          issuer: config.get<string>("jwt.issuer"),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisService, ToolsService],
  exports: [AuthService],
})
export class AuthModule {}
