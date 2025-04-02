import { registerAs } from "@nestjs/config";

export default registerAs("mongodb", () => ({
  uri: `mongodb://${encodeURIComponent(process.env.DB_USERNAME)}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  dbName: process.env.DB_NAME,
}));
