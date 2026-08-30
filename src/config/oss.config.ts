import { registerAs } from "@nestjs/config";

export default registerAs("oss", () => ({
  type: (process.env.OSS_TYPE || "s3") as "aliyun" | "s3" | "local",

  // 上传限制
  upload: {
    // 单文件大小上限（字节）；超过全局 body 解析上限的大文件会被提前拦截
    maxFileSize: Number(process.env.OSS_UPLOAD_MAX_SIZE) || 50 * 1024 * 1024,
    // 允许的文件扩展名白名单（空数组表示不限制）
    allowedExtensions: (process.env.OSS_UPLOAD_ALLOWED_EXTENSIONS || "jpg,jpeg,png,gif")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  },

  s3: {
    endpoint: process.env.OSS_S3_ENDPOINT || "http://localhost:9000",
    region: process.env.OSS_S3_REGION || "us-east-1",
    accessKey: process.env.OSS_S3_ACCESS_KEY || "rustfs-admin",
    secretKey: process.env.OSS_S3_SECRET_KEY || "rustfs-admin",
    bucketName: process.env.OSS_S3_BUCKET || "public",
    customDomain: process.env.OSS_S3_CUSTOM_DOMAIN || "",
  },

  aliyun: {
    endpoint: process.env.OSS_ALIYUN_ENDPOINT || "oss-cn-hangzhou.aliyuncs.com",
    accessKeyId: process.env.OSS_ALIYUN_ACCESS_KEY_ID || "",
    accessKeySecret: process.env.OSS_ALIYUN_ACCESS_KEY_SECRET || "",
    bucketName: process.env.OSS_ALIYUN_BUCKET || "",
  },

  local: {
    storagePath: process.env.OSS_LOCAL_STORAGE_PATH || "./uploads/",
  },
}));
