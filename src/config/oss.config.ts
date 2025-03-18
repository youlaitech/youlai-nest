import { registerAs } from "@nestjs/config";

export default registerAs("oss", () => ({
  endpoint: process.env.OSS_ENDPOINT,
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET_NAME,
}));
