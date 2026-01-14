import { registerAs } from "@nestjs/config";

// TypeORM 数据源配置
//
// 说明：
// - 仅负责 MySQL 连接参数，不包含业务开关
// - 所有参数都从环境变量读取，未配置时使用安全的本地默认值
// - `synchronize` 在生产环境必须为 false，避免自动改表结构

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

  // 数据库名称，建议与 Java 版保持一致：youlai_admin
  database: process.env.MYSQL_DB || "youlai_admin",

  // 自动加载通过 TypeOrmModule.forFeature 注册的实体
  autoLoadEntities: true,

  supportBigNumbers: true,

  bigNumberStrings: true,

  // 禁止自动同步实体到数据库结构（生产环境必须为 false）
  synchronize: false,

  // 输出 SQL 日志，开发环境建议开启，生产可通过环境变量关闭
  logging: process.env.TYPEORM_LOGGING === "false" ? false : true,
}));
