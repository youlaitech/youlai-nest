<div align="center">
   <img alt="logo" width="100" height="100" src="https://foruda.gitee.com/images/1733417239320800627/3c5290fe_716974.png">
   <h2>youlai-nest</h2>
   <img alt="Node.js" src="https://img.shields.io/badge/Node.js-20+-green.svg"/>
   <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-red.svg"/>
   <a href="https://gitee.com/youlaiorg/youlai-nest" target="_blank">
     <img alt="Gitee star" src="https://gitee.com/youlaiorg/youlai-nest/badge/star.svg"/>
   </a>
   <a href="https://github.com/youlaitech/youlai-nest" target="_blank">
     <img alt="Github star" src="https://img.shields.io/github/stars/youlaitech/youlai-nest.svg?style=social&label=Stars"/>
   </a>
</div>

<p align="center">
  <a target="_blank" href="https://vue.youlai.tech/">🖥️ 在线预览</a>
  <span>&nbsp;|&nbsp;</span>
  <a target="_blank" href="https://www.youlai.tech/youlai-nest">📑 阅读文档</a>
  <span>&nbsp;|&nbsp;</span>
  <a target="_blank" href="https://www.youlai.tech">🌐 官网</a>
</p>

## 📢 项目简介

`youlai-nest` 是 `vue3-element-admin` 配套的 Node.js 后端实现，基于 NestJS 11, TypeScript, TypeORM, JWT, Redis, MySQL 构建，是 **youlai 全家桶** 的重要组成部分。

- **🚀 企业级框架**: 基于 NestJS 11，提供稳定、可扩展的后端架构。
- **🔐 双重认证**: 支持 JWT 和 Redis Token 两种会话模式，可根据业务需求灵活切换。
- **🔑 权限管理**: 内置基于 RBAC 的权限模型，精确控制接口和按钮权限。
- **🛠️ 功能模块**: 包含用户、角色、菜单、部门、字典等后台管理系统的核心功能。

## 🌈 项目源码

| 项目类型        | Gitee                                                                | Github                                                                 | GitCode                                                             |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| ✅ Node.js 后端 | [youlai-nest](https://gitee.com/youlaiorg/youlai-nest)               | [youlai-nest](https://github.com/youlaitech/youlai-nest)               | [youlai-nest](https://gitcode.com/youlai/youlai-nest)               |
| vue3 前端       | [vue3-element-admin](https://gitee.com/youlaiorg/vue3-element-admin) | [vue3-element-admin](https://github.com/youlaitech/vue3-element-admin) | [vue3-element-admin](https://gitcode.com/youlai/vue3-element-admin) |
| uni-app 移动端  | [youlai-app](https://gitee.com/youlaiorg/youlai-app)                 | [youlai-app](https://github.com/youlaitech/youlai-app)                 | [youlai-app](https://gitcode.com/youlai/youlai-app)                 |

## 📚 项目文档

| 文档名称           | 访问地址                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| 项目介绍与使用指南 | [https://www.youlai.tech/docs/admin/backend/node/](https://www.youlai.tech/docs/admin/backend/node/) |

## 📁 项目目录

```text
youlai-nest/
├─ src/                      # 核心业务源码
│  ├─ main.ts                # 应用入口
│  ├─ app.module.ts          # 根模块
│  ├─ auth/                  # 认证与鉴权模块
│  ├─ system/                # 系统核心模块（用户/角色/菜单等）
│  ├─ core/                  # 框架核心（守卫/过滤器/拦截器/中间件等）
│  ├─ codegen/               # 代码生成模块
│  ├─ file/                  # 文件管理模块
│  ├─ websocket/             # WebSocket 模块
│  ├─ common/                # 公共能力（常量/枚举/异常/工具类等）
│  ├─ config/                # 配置文件
│  └─ typings/               # 类型定义
├─ sql/                      # 数据库脚本
├─ .env                      # 基础环境配置
├─ .env.dev                  # 开发环境配置
├─ .env.prod                 # 生产环境配置
└─ package.json              # 项目配置与脚本
```

## 🚀 快速启动

### 1. 环境准备

| 要求        | 说明         |
| ----------- | ------------ |
| **Node.js** | 20+ / 24 LTS |
| **pnpm**    | 包管理器     |
| **MySQL**   | 5.7+ 或 8.x  |
| **Redis**   | 7.x 稳定版   |

> ⚠️ **重要提示**：MySQL 与 Redis 为项目启动必需依赖，请确保服务已启动。

### 2. 数据库初始化

推荐使用 **Navicat**、**DBeaver** 或 **MySQL Workbench** 执行 `sql/mysql/youlai_admin.sql` 脚本，完成数据库和基础数据的初始化。

### 3. 修改配置

根据 `.env.example` 创建 `.env.dev` 和 `.env.prod` 文件，并根据实际情况修改 MySQL 和 Redis 的连接信息。

### 4. 启动项目

```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm run start:dev
```

启动成功后，访问 [http://localhost:8000/api-docs](http://localhost:8000/api-docs) 验证项目是否成功。

## 🐳 项目部署

### 1. 原生部署

```bash
# 构建
pnpm run build

# 启动
pnpm run start:prod
```

### 2. Docker 部署

```bash
# 构建并启动容器
docker compose up -d --build
```

## 💖 技术交流

① 关注「有来技术」公众号，点击菜单 **交流群** 获取加群二维码（此举防止广告进群，
感谢理解和支持）。

② 直接添加微信 **`haoxianrui`** 备注「前端/后端/全栈」。

![有来技术公众号](https://foruda.gitee.com/images/1737108820762592766/3390ed0d_716974.png)
