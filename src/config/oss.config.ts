import { registerAs } from "@nestjs/config";

// OSS 对象存储配置
// 对齐 youlai-boot：支持 aliyun、minio、local 三种类型，通过 OSS_TYPE 切换

export default registerAs("oss", () => ({
  // oss 类型：aliyun|minio|local
  type: (process.env.OSS_TYPE || "aliyun") as "aliyun" | "minio" | "local",

  // MinIO 配置
  minio: {
    // MinIO 服务地址，例如：http://localhost:9000
    endpoint: process.env.OSS_MINIO_ENDPOINT || "http://localhost:9000",
    // 访问凭据
    accessKey: process.env.OSS_MINIO_ACCESS_KEY || "minioadmin",
    // 凭据密钥
    secretKey: process.env.OSS_MINIO_SECRET_KEY || "minioadmin",
    // 存储桶名称
    bucketName: process.env.OSS_MINIO_BUCKET || "youlai",
    // 可选：自定义访问域名（优先级高于 endpoint 构造的地址）
    customDomain: process.env.OSS_MINIO_CUSTOM_DOMAIN || "",
  },

  // 阿里云 OSS 配置
  aliyun: {
    // 服务 Endpoint，例如：oss-cn-hangzhou.aliyuncs.com
    endpoint: process.env.OSS_ALIYUN_ENDPOINT || "oss-cn-hangzhou.aliyuncs.com",
    // 访问凭据
    accessKeyId: process.env.OSS_ALIYUN_ACCESS_KEY_ID || "your-access-key-id",
    // 凭据密钥
    accessKeySecret: process.env.OSS_ALIYUN_ACCESS_KEY_SECRET || "your-access-key-secret",
    // 存储桶名称
    bucketName: process.env.OSS_ALIYUN_BUCKET || "default",
  },

  // 本地存储配置
  local: {
    // 文件存储路径
    storagePath: process.env.OSS_LOCAL_STORAGE_PATH || "D:/data/oss/",
  },
}));
