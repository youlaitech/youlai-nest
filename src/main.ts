import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestInterceptor, ValidationPipe } from "@nestjs/common";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { ConfigService } from "@nestjs/config";
import * as session from "express-session";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
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

  // 全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  // Pass ConfigService to ResponseInterceptor so date formatting is configurable
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector), configService));

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );

  // Swagger 配置
  const config = new DocumentBuilder()
    .setTitle("有来技术")
    .setDescription("有来技术接口文档")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Ensure Swagger tag groups appear in a deterministic, human-friendly order.
  // If tags use numeric prefixes like "01.认证接口", this will sort by that leading number.
  if (document.tags && Array.isArray(document.tags)) {
    document.tags.sort((a, b) => {
      const parse = (t: { name: string }) => {
        const m = /^\\s*(\\d+)\\s*\\.\\s*(.*)$/.exec(t.name);
        if (m) return { num: parseInt(m[1], 10), rest: m[2].trim().toLowerCase() };
        // no numeric prefix -> place after numbered groups, sort by name
        return { num: Number.POSITIVE_INFINITY, rest: t.name.trim().toLowerCase() };
      };
      const A = parse(a);
      const B = parse(b);
      if (A.num !== B.num) return A.num - B.num;
      return A.rest.localeCompare(B.rest);
    });
  }
  SwaggerModule.setup("api-docs", app, document);

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

  const port = configService.get("SERVER_PORT", 3000);
  await app.listen(port);
  console.log(`应用已启动: http://localhost:${port}`);
  console.log(`接口文档: http://localhost:${port}/api-docs`);
}

bootstrap();
