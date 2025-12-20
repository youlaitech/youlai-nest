import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnModuleInit,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import * as winston from "winston";
import "winston-daily-rotate-file";
import { WinstonModule } from "nest-winston";
import { RedisModule } from "@liaoliaots/nestjs-redis";

import { AuthModule } from "./auth/auth.module"; // 认证相关模块（隐式包含 User, Role, Menu, Dept）
import { RedisCacheModule } from "./shared/cache/redis_cache.module";
import { OssModule } from "./shared/oss/oss.module"; // 对象存储模块
import { DictModule } from "./system/dict/dict.module"; // 系统字典模块
import { ConfigModule as SystemConfigModule } from "./system/config/config.module"; // 系统配置模块
import { WebsocketModule } from "./platform/websocket/websocket.module";
import { CodegenModule } from "./platform/codegen/codegen.module";
import { LogModule } from "./system/log/log.module";
import { NoticeModule } from "./system/notice/notice.module";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { LoggerMiddleware } from "./shared/logger/logger.middleware";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { XRequestInterceptor } from "./common/interceptors/request.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RedisTokenAuthGuard } from "./auth/redis-token.guard";

import jwtConfig from "./config/jwt.config";
import typeormConfig from "./config/typeorm.config";
import ossConfig from "./config/oss.config";
import redisConfig from "./config/redis.config";
import { DataScopeGuard } from "./common/guards/data-scope.guard";
import { DataScopeInterceptor } from "./common/interceptors/data-scope.interceptor";
import "./common/plugins/global-scope.plugin";

const envPath = `.env.${process.env.NODE_ENV || "dev"}`;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", envPath],
      load: [typeormConfig, redisConfig, ossConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        ...config.get("typeorm"),
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      useFactory: async (config: ConfigService) => {
        return {
          config: [
            {
              host: config.getOrThrow<string>("redis.host"),
              port: config.getOrThrow<number>("redis.port"),
              db: config.get<number>("redis.db") || 0,
              password: config.get<string>("redis.password"),
            },
          ],
        };
      },
      inject: [ConfigService],
    }),

    WinstonModule.forRoot({
      level: "debug",
      transports: [
        new winston.transports.DailyRotateFile({
          dirname: `logs`, // 日志保存的目录
          filename: "%DATE%.log", // 日志名称，占位符 %DATE% 取值为 datePattern 值。
          datePattern: "YYYY-MM-DD", // 日志轮换的频率，此处表示每天。
          zippedArchive: true, // 是否通过压缩的方式归档被轮换的日志文件。
          maxSize: "20m", // 设置日志文件的最大大小，m 表示 mb 。
          maxFiles: "7d", // 保留日志文件的最大天数，此处表示自动删除超过 7 天的日志文件。
          // 记录时添加时间戳信息
          format: winston.format.combine(
            winston.format.timestamp({
              format: "YYYY-MM-DD HH:mm:ss",
            }),
            winston.format.json()
          ),
        }),
      ],
    }),
    AuthModule,
    RedisCacheModule,
    OssModule,
    DictModule,
    SystemConfigModule,
    WebsocketModule,
    CodegenModule,
    LogModule,
    NoticeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtAuthGuard,
    RedisTokenAuthGuard,
    // 会话认证守卫：根据 SESSION_TYPE 选择 JWT 模式或 Redis 会话模式
    {
      provide: APP_GUARD,
      useFactory: (
        configService: ConfigService,
        jwtGuard: JwtAuthGuard,
        redisGuard: RedisTokenAuthGuard
      ) => {
        const sessionType = configService.get<string>("SESSION_TYPE") || "jwt";
        return sessionType === "redis-token" ? redisGuard : jwtGuard;
      },
      inject: [ConfigService, JwtAuthGuard, RedisTokenAuthGuard],
    },
    // 数据权限全局守卫
    {
      provide: APP_GUARD,
      useClass: DataScopeGuard,
    },
    // 应用http全局过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 应用拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: XRequestInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
