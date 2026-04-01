import { registerAs } from "@nestjs/config";

export default registerAs("oss", () => ({
  type: (process.env.OSS_TYPE || "aliyun") as "aliyun" | "minio" | "local",

  minio: {
    endpoint: process.env.OSS_MINIO_ENDPOINT || "http://localhost:9000",
    accessKey: process.env.OSS_MINIO_ACCESS_KEY || "",
    secretKey: process.env.OSS_MINIO_SECRET_KEY || "",
    bucketName: process.env.OSS_MINIO_BUCKET || "youlai",
    customDomain: process.env.OSS_MINIO_CUSTOM_DOMAIN || "",
  },

  aliyun: {
    endpoint: process.env.OSS_ALIYUN_ENDPOINT || "oss-cn-hangzhou.aliyuncs.com",
    accessKeyId: process.env.OSS_ALIYUN_ACCESS_KEY_ID || "",
    accessKeySecret: process.env.OSS_ALIYUN_ACCESS_KEY_SECRET || "",
    bucketName: process.env.OSS_ALIYUN_BUCKET || "",
  },

  local: {
    storagePath: process.env.OSS_LOCAL_STORAGE_PATH || "D:/data/oss/",
  },
}));
