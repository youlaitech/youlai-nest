import { registerAs } from "@nestjs/config";

export default registerAs("mongodb", () => ({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 27017,
  dbName: process.env.DB_NAME || "test",
  uri: `mongodb://${process.env.DB_USERNAME}:${encodeURIComponent(process.env.DB_PASSWORD)}@${process.env.DB_HOST}:${process.env.DB_PORT}`,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: process.env.NODE_ENV === "production",
  },
}));
