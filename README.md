<div align="center">

## 🎉 正在参加 Gitee 2025 最受欢迎开源软件评选

<a href="https://gitee.com/activity/2025opensource?ident=I6VXEH" target="_blank">
  <img src="https://img.shields.io/badge/🗳️_立即投票-支持本项目-ff6b35?style=for-the-badge&logo=gitee" alt="投票" height="50"/>
</a>

<p>
  <strong>一票就够，不用每天投 🙏 您的支持是我们持续更新的最大动力！</strong>
</p>

<p>
  <a href="https://gitee.com/activity/2025opensource?ident=I6VXEH" target="_blank">
    <strong>👉 点击徽章或这里投票 👈</strong>
  </a>
</p>

</div>

<div align="center">
   <img alt="logo" width="100" height="100" src="https://foruda.gitee.com/images/1733417239320800627/3c5290fe_716974.png">
   <h2><a href="https://gitee.com/youlaiorg/youlai-nest" target="_blank">
     youlai-nest
   </a></h2>

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

基于 node18、nest.js、MySQL、JWT、Redis、阿里云oss、Vue 3、Element-Plus 构建的前后端分离单体权限管理系统。

- **🚀 开发框架**: 使用 nest.js 和 Vue 3，以及 Element-Plus 等主流技术栈，实时更新。

- **🔐 安全认证**: 结合 NestJS 的自定义 AuthGuard 和 JWT，提供安全、无状态、分布式友好的身份验证和授权机制。

- **🔑 权限管理**: 基于 RBAC 模型，实现细粒度的权限控制，涵盖接口方法和按钮级别。

- **🛠️ 功能模块**: 包括用户管理、角色管理、菜单管理、部门管理、字典管理等多个功能。

- **📘 接口文档**: 自动生成接口文档，支持在线调试，提高开发效率。

## 🌈 项目源码

| 项目类型       | Gitee                                                                      | Github                                                                       | GitCode                                                                   |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| ✅ Node 后端   | [youlai-nest](https://gitee.com/youlaiorg/youlai-nest)                     | [youlai-nest](https://github.com/youlaitech/youlai-nest)                     | [youlai-nest](https://gitcode.com/youlai/youlai-nest)                     |
| vue3 前端      | [vue3-element-template](https://gitee.com/youlaiorg/vue3-element-template) | [vue3-element-template](https://github.com/youlaitech/vue3-element-template) | [vue3-element-template](https://gitcode.com/youlai/vue3-element-template) |
| uni-app 移动端 | [vue-uniapp-template](https://gitee.com/youlaiorg/vue-uniapp-template)     | [vue-uniapp-template](https://github.com/youlaitech/vue-uniapp-template)     | [vue-uniapp-template](https://gitcode.com/youlai/vue-uniapp-template)     |

## 📚 项目文档

| 文档名称           | 访问地址                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| 在线接口文档       | [https://www.apifox.cn/apidoc](https://www.apifox.cn/apidoc/shared-195e783f-4d85-4235-a038-eec696de4ea5) |
| 项目介绍与使用指南 | [https://www.youlai.tech/youlai-nest/](https://www.youlai.tech/youlai-nest/)                             |

## 🚀 项目启动

📚 完整流程参考: [项目启动](https://www.youlai.tech/youlai-nest/1.%E9%A1%B9%E7%9B%AE%E5%90%AF%E5%8A%A8/)

1. **数据库初始化（MySQL）**

   MySQL 初始化脚本位于：`sql/mysql/youlai_admin.sql`，脚本会创建示例库 `youlai_admin` 并初始化基础表结构与数据。
   - **可视化工具导入（Navicat 等）**

     使用 Navicat/HeidiSQL 等工具，选择你自己的 MySQL 实例，执行 `sql/mysql/youlai_admin.sql` 脚本即可。

2. **修改配置**

   默认使用 `.env`/`.env.dev` 中配置的 MySQL/Redis 连接信息，本地开发时请根据实际数据库地址、账号密码进行修改。

3. **启动项目**

   ```bash
   # 克隆代码
   git clone https://gitee.com/youlaiorg/youlai-nest.git

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

① 关注「有来技术」公众号，点击菜单 **交流群** 获取加群二维码（此举防止广告进群，感谢理解和支持）。

② 直接添加微信 **`haoxianrui`** 备注「前端/后端/全栈」。

![有来技术公众号](https://foruda.gitee.com/images/1737108820762592766/3390ed0d_716974.png)
