<div align="center">
   <img alt="logo" width="100" height="100" src="https://foruda.gitee.com/images/1724259461244885014/4de96569_716974.png">
   <h2>youlai-nest</h2>
   
   <a href="https://gitee.com/youlaiorg/youlai-nest" target="_blank">
     youlai-nest
   </a>     
  
   <br/>
   <img alt="有来技术" src="https://img.shields.io/badge/license-Apache%20License%202.0-blue.svg"/>
   <a href="https://gitee.com/youlaiorg" target="_blank">
     <img alt="有来技术" src="https://img.shields.io/badge/Author-有来开源组织-orange.svg"/>
   </a>
</div>

![](https://raw.gitmirror.com/youlaitech/image/main/docs/rainbow.png)

<div align="center">
  <a target="_blank" href="https://admin.youlai.tech/">🔍 在线预览</a> |  <a target="_blank" href="https://doc.youlai.tech/%E5%89%8D%E5%90%8E%E7%AB%AF%E6%A8%A1%E6%9D%BF/%E5%90%8E%E7%AB%AF%E6%89%8B%E5%86%8C/%E9%A1%B9%E7%9B%AE%E7%AE%80%E4%BB%8B.html">📖 阅读文档</a> | <a href="./README.en-US.md">🌐English</a>
</div>

## 📢 项目简介

**在线预览**: [https://vue3.youlai.tech](https://vue3.youlai.tech)

基于 node18、nest.js、mongoDB、JWT、Redis、阿里云oss、Vue 3、Element-Plus 构建的前后端分离单体权限管理系统。

> 📖 [查看详细启动文档](./docs/getting-started.md)

- **🚀 开发框架**: 使用 nest.js 和 Vue 3，以及 Element-Plus 等主流技术栈，实时更新。

- **🔐 安全认证**: 结合 NestJS 的自定义 AuthGuard 和 JWT，提供安全、无状态、分布式友好的身份验证和授权机制。

- **🔑 权限管理**: 基于 RBAC 模型，实现细粒度的权限控制，涵盖接口方法和按钮级别。

- **🛠️ 功能模块**: 包括用户管理、角色管理、菜单管理、部门管理、字典管理等多个功能。

- **📘 接口文档**: 自动生成接口文档，支持在线调试，提高开发效率。

## 🛠️ 技术栈

- **后端框架：** 
  - NestJS v10.x - 渐进式 Node.js 框架
  - MongoDB v7.x - MongoDB数据库
  - Redis v7.x - 缓存数据库
  - JWT - 用户认证
  - Swagger/OpenAPI - API文档生成

- **存储服务：**
  - 阿里云OSS - 对象存储服务

- **开发工具：**
  - TypeScript v5.x - JavaScript的超集
  - ESLint - 代码检查工具
  - Prettier - 代码格式化工具
  - Jest - 单元测试框架

## 💻 环境要求

- Node.js >= 18.x
- MongoDB >= 7.x
- Redis >= 7.x
- pnpm >= 8.x

## 📦 模块说明

- **auth/** - 认证模块，处理用户登录、注册、JWT token等
- **user/** - 用户管理模块，用户CRUD操作
- **roles/** - 角色管理模块，角色权限分配
- **menu/** - 菜单管理模块，系统菜单配置
- **dept/** - 部门管理模块，组织架构管理
- **dict/** - 字典管理模块，系统参数配置
- **oss/** - 文件存储模块，文件上传下载
- **common/** - 公共模块，包含工具类、拦截器等

## 🔑 权限设计

系统采用 RBAC (基于角色的访问控制) 模型：

1. 用户关联角色(多对多)
2. 角色关联权限(多对多)
3. 权限包括:
   - 菜单权限
   - 按钮权限
   - API接口权限

## 📝 API 文档

本项目使用 Swagger 自动生成 API 文档，包含以下特性：

- 接口描述
- 请求/响应参数说明
- 在线调试功能
- 接口分组管理

访问地址：
- 本地开发：http://localhost:8989/apiDoc
- 线上环境：https://你的域名/apiDoc

## 🔧 配置说明

主要配置文件:

1. `.env` - 默认环境配置
2. `.env.dev` - 开发环境配置
3. `.env.prod` - 生产环境配置

关键配置项:
```env
# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/youlai

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 阿里云OSS配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your-access-key
OSS_ACCESS_KEY_SECRET=your-secret-key
OSS_BUCKET=your-bucket
```

## 📁 项目目录
```
youlai-nest
.
├── dist                               # 编译后的输出目录（TypeScript 编译后生成的 JavaScript 文件）
├── logs                               # 日志文件目录
├── mongodb                            # MongoDB 数据备份或导出目录
├── node_modules                       # 项目依赖的第三方模块
├── src                                # 源代码目录
│   ├── auth                           # 认证模块
│   │   ├── dto                        # 数据传输对象（DTO）定义
│   │   └── vo                         # 视图对象（VO）定义
│   ├── backup                         # 数据备份模块
│   │   ├── dto                        # 数据传输对象（DTO）定义
│   │   └── entities                   # 备份数据的实体定义
│   ├── cache                          # 缓存管理模块
│   ├── common                         # 公共模块，存放可重用的通用代码
│   │   ├── decorator                  # 自定义装饰器
│   │   ├── dto                        # 通用数据传输对象（DTO）定义
│   │   ├── enums                      # 枚举类型定义
│   │   ├── http-exception             # HTTP 异常处理
│   │   ├── interceptor                # 拦截器定义
│   │   ├── public                     # 公共文件（如静态资源）
│   │   ├── schema                     # 公共 Mongoose 模式定义
│   │   └── shared                     # 公共服务和工具类
│   ├── dept                           # 部门模块
│   │   ├── dto                        # 部门模块的数据传输对象（DTO）定义
│   │   └── schemas                    # 部门模块的 Mongoose 模式定义
│   ├── dict                           # 数据字典模块
│   │   ├── dto                        # 数据字典的数据传输对象（DTO）定义
│   │   └── schemas                    # 数据字典的 Mongoose 模式定义
│   ├── gen                            # 代码生成模块
│   │   ├── dto                        # 代码生成模块的数据传输对象（DTO）定义
│   │   ├── entities                   # 代码生成模块的实体定义
│   │   └── schemas                    # 代码生成模块的 Mongoose 模式定义
│   ├── menu                           # 菜单模块
│   │   ├── dto                        # 菜单模块的数据传输对象（DTO）定义
│   │   ├── interface                  # 菜单模块的接口定义
│   │   └── schemas                    # 菜单模块的 Mongoose 模式定义
│   ├── oss                            # 对象存储模块（可能用于处理文件上传和管理）
│   ├── roles                          # 角色管理模块
│   │   ├── dto                        # 角色模块的数据传输对象（DTO）定义
│   │   └── schemas                    # 角色模块的 Mongoose 模式定义
│   ├── user                           # 用户模块
│   │   ├── dto                        # 用户模块的数据传输对象（DTO）定义
│   │   └── schemas                    # 用户模块的 Mongoose 模式定义
│   └── utils                          # 工具模块
│       └── service                    # 通用的工具服务类（例如日期处理、字符串处理等）
└── test                               # 测试文件目录

    
└── end       
```

## 🌺 前端工程
| Gitee | Github |
|-------|------|
| [vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin)  | [vue3-element-admin](https://github.com/youlaitech/vue3-element-admin)  |


## 🌈 接口文档


- `swagger` 接口文档：[http://localhost:8989/apiDoc](http://localhost:8989/swagger-ui/index.html)
- `apifox`  在线接口文档：[https://www.apifox.cn/apidoc](https://www.apifox.cn/apidoc/shared-195e783f-4d85-4235-a038-eec696de4ea5)


## 🚀 项目启动

1. **数据库初始化**

   导入mongodb内的数据完成基础数据的初始化

2. **修改配置**

   [env](src/main/resources/application-dev.yml) 修改 Mongodb、阿里云oss、Redis连接配置；

3. **启动项目**

  ```bash
# 克隆代码

# 切换目录
cd youlai-nest

# 安装 pnpm
npm install pnpm -g

# 设置镜像源(可忽略)
pnpm config set registry https://registry.npmmirror.com

# 安装依赖
pnpm install

# 启动运行
pnpm run start:dev
```

   访问接口文档地址 [http://localhost:8989/apiDoc](http://localhost:8989/doc.html) 验证项目启动是否成功.





[![contributors](https://contrib.rocks/image?repo=haoxianrui/youlai-nest)](https://github.com/haoxianrui/youlai-nest/graphs/contributors)


## 💖 加交流群

> 关注公众号【有来技术】，获取交流群二维码，不想关注公众号或二维码过期欢迎加我微信(`haoxianrui`)备注【有来】即可，拉你进群。

| ![](https://s2.loli.net/2022/11/19/OGjum9wr8f6idLX.png) |
|---------------------------------------------------------|
