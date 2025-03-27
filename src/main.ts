import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NestInterceptor, ValidationPipe } from "@nestjs/common";

import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { ConfigService } from "@nestjs/config";
import * as session from "express-session";

async function bootstrap() {
  try {
    const configService = new ConfigService();
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix("/api/v1");
    app.enableCors({
      origin: true,
      methods: "GET,PUT,POST,DELETE,PATCH",
      allowedHeaders: "Content-Type,Authorization",
      exposedHeaders: "Content-Range,X-Content-Range",
      credentials: true,
      maxAge: 3600,
    });
    const options = new DocumentBuilder()
      .setTitle("基础代码") // 标题
      .setDescription("后台管理系统接口文档") // 描述
      .setVersion("1.0") // 版本
      .build();
    // session
    app.use(
      session({
        secret: "dmyxs",
        resave: false,
        saveUninitialized: true,
        cookie: {
          sameSite: "none",
          secure: true,
          maxAge: 100000,
          httpOnly: true,
        }, //以cookie存储到客户端
        // rolling: true, //每次重新请求时，重新设置cookie
      })
    );
    const document = SwaggerModule.createDocument(app, options);
    //配置swgger地址
    SwaggerModule.setup("apiDoc", app, document);
    const reflector = app.get(Reflector);
    app.useGlobalInterceptors(<NestInterceptor>new TransformInterceptor(reflector));
    app.useGlobalPipes(new ValidationPipe());

    await app.listen(configService.get("SERVER_PORT"));
    console.log("http://localhost:" + configService.get("SERVER_PORT"));
  } catch (e) {}
}
bootstrap();
