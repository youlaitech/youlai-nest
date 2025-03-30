import * as crypto from "crypto";
// 加密的工具函数,使用sha256算法进行加密
export default (value: string, salt: string) =>
  crypto.pbkdf2Sync(value, salt, 1000, 18, "sha256").toString("hex");
