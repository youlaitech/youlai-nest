import { registerAs } from "@nestjs/config";

// TypeORM 数据源配置

export default registerAs("typeorm", () => ({
  // 数据库类型，目前只支持 mysql
  type: "mysql" as const,

  // 数据库主机
  host: process.env.MYSQL_HOST || "localhost",

  // 数据库端口
  port: Number(process.env.MYSQL_PORT) || 3306,

  // 数据库账号
  username: process.env.MYSQL_USER || "root",

  // 数据库密码
  password: process.env.MYSQL_PASSWORD || "root",

  // 数据库名称（youlai_admin）
  database: process.env.MYSQL_DB || "youlai_admin",

  // 自动加载通过 TypeOrmModule.forFeature 注册的实体
  autoLoadEntities: true,

  supportBigNumbers: true,

  bigNumberStrings: true,

  // 禁止自动同步实体到数据库结构
  synchronize: false,

  // 输出 SQL 日志，可通过环境变量关闭
  logging: process.env.TYPEORM_LOGGING === "false" ? false : true,
}));
