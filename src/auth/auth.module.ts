import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { WxMaAuthService } from "./wxma-auth.service";
import { WxMaAuthController } from "./wxma-auth.controller";
import { UserModule } from "../system/user/user.module";
import { RoleModule } from "../system/role/role.module";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtStrategy } from "./jwt.strategy";
import { RedisSharedModule } from "../core/redis/redis.module";
import { RedisService } from "../core/redis/redis.service";
import { ToolsService } from "../common/utils/service/tools.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SysUser } from "../system/user/entities/sys-user.entity";
import { SysUserSocial } from "../system/user/entities/sys-user-social.entity";

@Module({
  imports: [
    UserModule,
    RoleModule,
    RedisSharedModule,
    TypeOrmModule.forFeature([SysUser, SysUserSocial]),
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
  controllers: [AuthController, WxMaAuthController],
  providers: [AuthService, WxMaAuthService, JwtStrategy, RedisService, ToolsService],
  exports: [AuthService, WxMaAuthService],
})
export class AuthModule {}
