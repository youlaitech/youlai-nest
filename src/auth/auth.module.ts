import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { UserModule } from "../system/user/user.module";
import { RoleModule } from "../system/role/role.module";
import { LogModule } from "../system/log/log.module";
import { SysUser } from "../system/user/entities/sys-user.entity";
import { SysUserSocial } from "../system/user/entities/sys-user-social.entity";
import { RedisSharedModule } from "../common/redis/redis.module";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { CaptchaService } from "./captcha.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { QrCodeAuthController } from "./qr-code/qr-code-auth.controller";
import { QrCodeAuthService } from "./qr-code/qr-code-auth.service";
import { WxMaAuthController } from "./wxma/wxma-auth.controller";
import { WxMaAuthService } from "./wxma/wxma-auth.service";

@Module({
  imports: [
    UserModule,
    RoleModule,
    LogModule,
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
  controllers: [AuthController, QrCodeAuthController, WxMaAuthController],
  providers: [
    AuthService,
    TokenService,
    CaptchaService,
    JwtStrategy,
    QrCodeAuthService,
    WxMaAuthService,
  ],
})
export class AuthModule {}
