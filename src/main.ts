import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe, HttpStatus } from "@nestjs/common";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { ConfigService } from "@nestjs/config";
import * as session from "express-session";
import type { ValidationError } from "class-validator";
import { BusinessException } from "./common/exceptions/business.exception";
import { ErrorCode } from "./common/enums/error-code.enum";

async function bootstrap() {
  // Ensure BigInt is always JSON-serializable (and matches Java Long/BigInteger -> string strategy)

  if (typeof (BigInt.prototype as any).toJSON !== "function") {
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 全局前缀
  app.setGlobalPrefix("/api/v1");

  // 跨域设置
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // 全局拦截器
  // Pass ConfigService to ResponseInterceptor so date formatting is configurable
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector), configService));

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
      forbidNonWhitelisted: false,
      exceptionFactory: (errors: ValidationError[]) => {
        const collect = (es: ValidationError[]): string[] => {
          const out: string[] = [];
          for (const e of es) {
            if (e.constraints) {
              out.push(...Object.values(e.constraints));
            }
            if (e.children && e.children.length > 0) {
              out.push(...collect(e.children));
            }
          }
          return out;
        };

        const messages = collect(errors)
          .map((m) => String(m).trim())
          .filter(Boolean);
        const msg = messages[0] || ErrorCode.USER_REQUEST_PARAMETER_ERROR.msg;
        return new BusinessException({
          code: ErrorCode.USER_REQUEST_PARAMETER_ERROR.code,
          msg,
          httpStatus: HttpStatus.BAD_REQUEST,
        });
      },
    })
  );

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle("youlai-nest")
    .setDescription(`youlai 全家桶（Node/Nest 11）权限管理后台接口文档`)
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // 使用内置 alpha 排序，配合 01/02 数字前缀即可保证从小到大显示。
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      tagsSorter: "alpha",
    },
  });

  // Session 配置
  app.use(
    session({
      secret: configService.get("JWT_SECRET_KEY"),
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7天
      },
    })
  );

  // 端口统一通过环境变量 SERVER_PORT 配置（默认 8000）
  const portRaw = configService.get("APP_PORT") ?? configService.get("SERVER_PORT") ?? 8000;
  const port = Number(portRaw) || 8000;
  await app.listen(port);
  console.log(`应用已启动: http://localhost:${port}`);
  console.log(`接口文档: http://localhost:${port}/api-docs`);
}

void bootstrap();
