import { registerAs } from "@nestjs/config";

export default registerAs("typeorm", () => ({
  type: "mysql",
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  username: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "root",
  database: process.env.MYSQL_DB || "youlai_boot",
  autoLoadEntities: true,
  synchronize: false, // 生产环境必须为 false
  logging: true,
}));
