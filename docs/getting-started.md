# youlai-nest 项目启动指南

## 项目介绍

youlai-nest 是一个基于 NestJS 框架开发的后台管理系统，采用了现代化的技术栈和最佳实践。本项目提供了完整的权限管理功能，包括用户管理、角色管理、菜单管理等核心功能。

## 功能特性

- 🔐 完整的 RBAC 权限管理
- 📝 MongoDB 数据库支持
- 🚀 Redis 缓存集成
- 📁 阿里云 OSS 文件存储
- 📚 Swagger API 文档
- 🔒 JWT 身份认证
- 🎨 优雅的项目结构

## 环境准备

在开始之前，请确保你的开发环境满足以下要求：

1. **Node.js 环境**

   ```bash
   # 检查 Node.js 版本（需要 >= 18.x）
   node --version
   ```

2. **MongoDB 数据库**

   - 安装 MongoDB（>= 7.x）
   - 启动 MongoDB 服务

   ```bash
   # macOS 使用 brew 安装
   brew install mongodb-community
   brew services start mongodb-community
   ```

3. **Redis 服务**

   - 安装 Redis（>= 7.x）
   - 启动 Redis 服务

   ```bash
   # macOS 使用 brew 安装
   brew install redis
   brew services start redis
   ```

4. **pnpm 包管理器**
   ```bash
   # 全局安装 pnpm
   npm install -g pnpm
   ```

## 快速开始

### 1. 克隆项目

```bash
git clone https://gitee.com/youlaiorg/youlai-nest.git
cd youlai-nest
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

1. 复制环境变量模板文件

```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置：

```env
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/youlai

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 阿里云OSS配置（如需使用文件上传功能）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
OSS_BUCKET=your-bucket
```

### 4. 初始化数据库

1. 导入初始数据（在 mongodb 目录下）

```bash
mongorestore -d youlai ./mongodb/
```

### 5. 启动项目

1. 开发模式

```bash
pnpm run start:dev
```

2. 生产模式

```bash
# 构建项目
pnpm run build

# 启动服务
pnpm run start:prod
```

### 6. 访问服务

- 接口文档：http://localhost:8989/apiDoc
- 默认管理员账号：admin
- 默认密码：123456

## 开发指南

### 项目结构说明

```
src/
├── auth/           # 认证模块
├── user/           # 用户模块
├── roles/          # 角色模块
├── menu/           # 菜单模块
├── dept/           # 部门模块
├── dict/           # 字典模块
├── oss/            # 文件存储模块
└── common/         # 公共模块
```

### 开发规范

1. **代码风格**

   - 使用 ESLint 和 Prettier 进行代码格式化
   - 运行 `pnpm run lint` 检查代码风格
   - 运行 `pnpm run format` 格式化代码

2. **提交规范**
   - feat: 新功能
   - fix: 修复问题
   - docs: 文档修改
   - style: 代码格式修改
   - refactor: 代码重构
   - test: 测试用例修改
   - chore: 其他修改

### 常见问题

1. **MongoDB 连接失败**

   - 检查 MongoDB 服务是否启动
   - 验证连接字符串是否正确
   - 确认数据库用户名密码是否正确

2. **Redis 连接失败**

   - 检查 Redis 服务是否启动
   - 验证 Redis 配置是否正确

3. **文件上传失败**
   - 检查阿里云 OSS 配置是否正确
   - 确认 OSS Bucket 权限设置

## NestJS 基础使用指南

### 1. 创建新模块

在 NestJS 中，模块是组织应用程序结构的基本单位。使用以下命令创建新模块：

```bash
# 创建名为 example 的新模块
nest generate module example
```

这将创建以下文件结构：

```
src/example/
└── example.module.ts
```

### 2. 创建控制器

控制器负责处理传入的请求和向客户端返回响应：

```bash
# 创建控制器
nest generate controller example
```

控制器示例：

```typescript
import { Controller, Get, Post, Body, Param } from "@nestjs/common";

@Controller("example")
export class ExampleController {
  @Get()
  findAll() {
    return "This action returns all examples";
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return `This action returns example #${id}`;
  }

  @Post()
  create(@Body() createExampleDto: any) {
    return "This action adds a new example";
  }
}
```

### 3. 创建服务

服务用于封装业务逻辑：

```bash
# 创建服务
nest generate service example
```

服务示例：

```typescript
import { Injectable } from "@nestjs/common";

@Injectable()
export class ExampleService {
  private readonly examples = [];

  create(example: any) {
    this.examples.push(example);
    return example;
  }

  findAll() {
    return this.examples;
  }

  findOne(id: string) {
    return this.examples.find((item) => item.id === id);
  }
}
```

### 4. 创建 DTO（数据传输对象）

DTO 用于定义数据的结构：

```typescript
// create-example.dto.ts
export class CreateExampleDto {
  readonly name: string;
  readonly description: string;
}
```

### 5. 使用中间件

中间件示例：

```typescript
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    next();
  }
}
```

在模块中应用中间件：

```typescript
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { LoggerMiddleware } from "./logger.middleware";

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes("example");
  }
}
```

### 6. 使用管道

管道用于数据转换和验证：

```typescript
import { PipeTransform, Injectable, ArgumentMetadata } from "@nestjs/common";

@Injectable()
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    return value;
  }
}
```

### 7. 异常处理

使用内置的异常过滤器：

```typescript
import { HttpException, HttpStatus } from "@nestjs/common";

// 在控制器或服务中抛出异常
throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
```

### 8. 使用守卫

守卫用于身份验证和授权：

```typescript
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return true;
  }
}
```

### 9. 配置 Swagger 文档

在控制器中使用 Swagger 装饰器：

```typescript
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("example")
@Controller("example")
export class ExampleController {
  @ApiOperation({ summary: "获取所有示例" })
  @ApiResponse({ status: 200, description: "成功返回示例列表" })
  @Get()
  findAll() {
    return "This action returns all examples";
  }
}
```

### 10. 单元测试

使用 Jest 进行单元测试：

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ExampleService } from "./example.service";

describe("ExampleService", () => {
  let service: ExampleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExampleService],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
```

## 部署指南

### Docker 部署

1. 构建镜像

```bash
docker build -t youlai-nest .
```

2. 运行容器

```bash
docker run -d -p 8989:8989 --name youlai-nest youlai-nest
```

### PM2 部署

1. 安装 PM2

```bash
npm install -g pm2
```

2. 启动服务

```bash
pm2 start dist/main.js --name youlai-nest
```

## 技术支持

- 项目文档：https://doc.youlai.tech
- 问题反馈：https://gitee.com/youlaiorg/youlai-nest/issues
- 交流群：关注公众号【有来技术】获取群二维码

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request
