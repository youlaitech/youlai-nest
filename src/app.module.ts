import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  OnModuleInit,
} from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import "winston-daily-rotate-file";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import logger from "./common/logger.middleware";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpExceptionFilter } from "./common/http-exception/http-exception.filter";
import { XRequestInterceptor } from "./common/interceptor/request.interceptor";
import { AuthModule } from "./auth/auth.module";
import { RedisModule } from "@liaoliaots/nestjs-redis";
import { RedisCacheModule } from "./cache/redis_cache.module";
import { OssModule } from "./oss/oss.module";
import { ErrorHandlingService } from "./common/services/error-handling.service";
import mongoose from "mongoose";
import { AuthGuard } from "./auth/auth.guard";
import { SystemModule } from "./system/system.module";

import mongodbConfig from "./config/mongodb.config";
import redisConfig from "./config/redis.config";
import ossConfig from "./config/oss.config";

import { validateEnv } from "./config/envs/env.schema";
const envPath = `.env.${process.env.NODE_ENV || "dev"}`;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv, // 环境变量强校验
      envFilePath: [".env", envPath], // 基础配置 + 环境覆盖
      load: [mongodbConfig, redisConfig, ossConfig],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get("mongodb.uri"),
        dbName: config.get("mongodb.dbName"),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        config: [
          // 存储实例
          {
            host: config.get("redis.host"),
            port: config.get("redis.port"),
            db: config.get("redis.db"),
            password: config.get("redis.password"),
            keyPrefix: config.get("redis.keyPrefix"),
          },
        ],
      }),
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
    SystemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ErrorHandlingService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
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
export class AppModule implements OnModuleInit, NestModule {
  onModuleInit() {
    mongoose.set("toJSON", {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString(); // 转换 _id 为 id
        delete ret._id; // 删除 _id 字段
        delete ret.__v; // 删除版本字段（如果存在）
      },
    });

    mongoose.set("toObject", {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString(); // 转换 _id 为 id
        delete ret._id; // 删除 _id 字段
        delete ret.__v; // 删除版本字段（如果存在）
      },
    });
  }
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(logger).forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
