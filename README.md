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
  <a target="_blank" href="https://vue.youlai.tech/">🔍 在线预览</a> |  <a target="_blank" href="https://www.youlai.tech/youlai-nest/">📖 阅读文档</a> | <a href="./README.en-US.md">🌐English</a>
</div>

## 📢 项目简介

**在线预览**: [https://vue.youlai.tech](https://vue.youlai.tech)

基于 node18、nest.js、mongoDB、JWT、Redis、阿里云oss、Vue 3、Element-Plus 构建的前后端分离单体权限管理系统。

> 📖 [查看详细启动文档](./docs/getting-started.md)

- **🚀 开发框架**: 使用 nest.js 和 Vue 3，以及 Element-Plus 等主流技术栈，实时更新。

- **🔐 安全认证**: 结合 NestJS 的自定义 AuthGuard 和 JWT，提供安全、无状态、分布式友好的身份验证和授权机制。

- **🔑 权限管理**: 基于 RBAC 模型，实现细粒度的权限控制，涵盖接口方法和按钮级别。

- **🛠️ 功能模块**: 包括用户管理、角色管理、菜单管理、部门管理、字典管理等多个功能。

- **📘 接口文档**: 自动生成接口文档，支持在线调试，提高开发效率。

## 📚 项目文档

- [项目启动指南](./docs/getting-started.md) - 详细的环境准备和项目启动步骤
- [项目结构与实现](./docs/project-structure.md) - 项目架构和核心功能实现说明
  - 核心模块介绍
  - 项目特性实现
  - 最佳实践指南
  - 常见问题解决方案
  - 部署与维护指南

## 🛠️ 技术栈

- **后端框架：**

  - NestJS v11.x - 渐进式 Node.js 框架
  - MongoDB v8.x - MongoDB数据库
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

## 📝 API 文档

本项目使用 Swagger 自动生成 API 文档，包含以下特性：

- 接口描述
- 请求/响应参数说明
- 在线调试功能
- 接口分组管理

访问地址：

- 本地开发：http://localhost:9090/apiDoc
- 线上环境：https://你的域名/apiDoc
- - `apifox` 在线接口文档：[https://www.apifox.cn/apidoc](https://www.apifox.cn/apidoc/shared-195e783f-4d85-4235-a038-eec696de4ea5)

## 🌺 前端工程

| Gitee                                                                | Github                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin) | [vue3-element-admin](https://github.com/youlaitech/vue3-element-admin) |

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

访问接口文档地址 [http://localhost:9090/apiDoc](http://localhost:9090/doc.html) 验证项目启动是否成功.

## 💖 加交流群

> 关注公众号【有来技术】，获取交流群二维码，不想关注公众号或二维码过期欢迎加我微信(`haoxianrui`)备注【有来】即可，拉你进群。

| ![](https://s2.loli.net/2022/11/19/OGjum9wr8f6idLX.png) |
| ------------------------------------------------------- |
