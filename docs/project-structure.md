# youlai-nest 项目结构与实现指南

## 项目整体架构

youlai-nest 项目采用模块化的架构设计，基于 NestJS 框架实现。每个功能模块都是独立的，通过依赖注入实现模块间的解耦。

## 核心模块介绍

### 1. 认证模块 (auth)

认证模块负责用户登录、权限验证等功能。

```typescript
// auth.module.ts 的核心实现
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN },
    }),
    // ... 其他导入
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

主要功能：

- JWT 认证实现
- 登录接口
- 权限验证守卫
- Token 管理

### 2. 用户模块 (user)

用户模块处理用户信息的管理。

```typescript
// user.schema.ts 的核心实现
@Schema()
export class User extends BaseEntity {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  nickname: string;

  // ... 其他属性
}
```

主要功能：

- 用户 CRUD 操作
- 用户信息管理
- 密码加密处理
- 用户角色关联

### 3. 角色模块 (roles)

角色模块负责角色权限管理。

```typescript
// roles.service.ts 的核心功能
@Injectable()
export class RolesService {
  async create(createRoleDto: CreateRoleDto) {
    // 角色创建逻辑
  }

  async findAll(query: any) {
    // 角色查询逻辑
  }

  // ... 其他方法
}
```

主要功能：

- 角色管理
- 权限分配
- 角色-菜单关联

### 4. 缓存模块 (cache)

使用 Redis 实现的缓存服务。

```typescript
// redis_cache.service.ts 的核心实现
@Injectable()
export class RedisCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async set(key: string, value: any, ttl?: number) {
    await this.cacheManager.set(key, value, ttl);
  }

  async get(key: string) {
    return await this.cacheManager.get(key);
  }
}
```

主要功能：

- 数据缓存
- 缓存过期管理
- 缓存清理

### 5. 公共模块 (common)

包含项目的通用功能和工具。

#### 5.1 异常处理

```typescript
// unify-exception.filter.ts
@Catch()
export class UnifyExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 统一异常处理逻辑
  }
}
```

#### 5.2 响应拦截器

```typescript
// transform.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 响应数据转换逻辑
  }
}
```

#### 5.3 日志中间件

```typescript
// logger.middleware.ts
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    // 日志记录逻辑
  }
}
```

## 项目特性实现

### 1. 权限控制实现

项目使用 RBAC（基于角色的访问控制）模型实现权限管理：

```typescript
// auth.guard.ts
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 权限验证逻辑
  }
}
```

### 2. 数据库设计

使用 MongoDB 作为数据库，通过 Mongoose 进行对象映射：

```typescript
// baseEntity.schema.ts
@Schema()
export class BaseEntity {
  @Prop({ type: String })
  _id: string;

  @Prop({ default: Date.now })
  createTime: Date;

  @Prop({ default: Date.now })
  updateTime: Date;
}
```

### 3. API 文档生成

使用 Swagger 自动生成 API 文档：

```typescript
// main.ts 中的 Swagger 配置
const config = new DocumentBuilder()
  .setTitle("youlai-nest API")
  .setDescription("API documentation")
  .setVersion("1.0")
  .addBearerAuth()
  .build();
```

## 最佳实践

### 1. 目录结构规范

```
src/
├── modules/           # 功能模块
│   ├── auth/         # 认证模块
│   ├── user/         # 用户模块
│   └── roles/        # 角色模块
├── common/           # 公共模块
│   ├── decorators/   # 装饰器
│   ├── filters/      # 过滤器
│   └── interceptors/ # 拦截器
└── config/           # 配置文件
```

### 2. 开发规范

1. **命名规范**

   - 文件名使用小写字母，单词间用横线连接
   - 类名使用 PascalCase
   - 方法和变量使用 camelCase

2. **代码组织**

   - 每个模块都应该有自己的目录
   - 相关的功能应该放在同一个模块中
   - 公共功能放在 common 目录下

3. **错误处理**
   - 使用统一的异常过滤器
   - 定义明确的错误码和错误信息
   - 适当的日志记录

### 3. 性能优化

1. **缓存策略**

   - 合理使用 Redis 缓存
   - 设置适当的缓存过期时间
   - 及时清理无用缓存

2. **数据库优化**

   - 建立合适的索引
   - 使用投影查询
   - 避免大量数据查询

3. **代码优化**
   - 使用异步操作
   - 避免循环依赖
   - 合理使用依赖注入

## 常见问题与解决方案

1. **跨域处理**

```typescript
// main.ts
app.enableCors({
  origin: true,
  credentials: true,
});
```

2. **文件上传**

```typescript
// 使用 multer 处理文件上传
@UseInterceptors(FileInterceptor('file'))
@Post('upload')
uploadFile(@UploadedFile() file) {
  // 文件处理逻辑
}
```

3. **请求验证**

```typescript
// 使用 class-validator 进行请求验证
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

## 部署与维护

1. **环境配置**

   - 使用 .env 文件管理环境变量
   - 区分开发和生产环境配置
   - 敏感信息加密存储

2. **日志管理**

   - 使用统一的日志格式
   - 分级别记录日志
   - 定期清理日志文件

3. **监控告警**
   - 接口响应时间监控
   - 错误率监控
   - 服务器资源监控
