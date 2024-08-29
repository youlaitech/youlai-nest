import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { ToolsService } from '../utils/service/tools.service';
import { Redis_cacheModule } from '../cache/redis_cache.module';
import { Redis_cacheService } from '../cache/redis_cache.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    ToolsService,
    Redis_cacheService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule, forwardRef(() => Redis_cacheModule)],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get('JWT_SECRET'),
          global: true,
          signOptions: {
            expiresIn: '24h',
          },
        };
      },
    }),
  ],
})
export class AuthModule {}
