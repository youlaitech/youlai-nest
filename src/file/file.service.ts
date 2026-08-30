import { Injectable, Inject } from "@nestjs/common";

import * as dayjs from "dayjs";
import { ConfigType } from "@nestjs/config";
import ossConfig from "../config/oss.config";
import OSS, * as Client from "ali-oss";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as $OpenApi from "@alicloud/openapi-client";
import ocr_api20210707, * as $ocr_api20210707 from "@alicloud/ocr-api20210707";
import Util, * as $Util from "@alicloud/tea-util";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

/**
 * 文件服务（阿里云 OSS/S3(RustFS)/本地存储）
 */
@Injectable()
export class FileService {
  /** 当前 OSS 类型：aliyun | s3 | local */
  private readonly ossType: "aliyun" | "s3" | "local";

  /** 阿里云 OSS 客户端 */
  private aliClient: OSS;
  private aliConfig: OSS.Options & { bucket: string };
  private staticClient: OSS;
  private staticConfig: OSS.Options & { bucket: string };

  /** S3 客户端及配置（当 ossType=s3 时启用，当前部署 RustFS） */
  private s3Client: S3Client | null = null;
  private s3Bucket: string | null = null;
  private s3Config: ConfigType<typeof ossConfig>["s3"] | null = null;

  // OCR 身份证识别（阿里云）
  private OCRClient: ocr_api20210707 | null = null;
  private OCRConfig: $OpenApi.Config = new $OpenApi.Config({});

  constructor(
    @Inject(ossConfig.KEY)
    private readonly ossConf: ConfigType<typeof ossConfig>
  ) {
    this.ossType = ossConf.type;

    // 阿里云 OSS 初始化
    if (this.ossType === "aliyun") {
      const ali = ossConf.aliyun;

      this.aliConfig = {
        region: ali.endpoint, // ali-oss 里 region 可用 endpoint 配置
        accessKeyId: ali.accessKeyId,
        accessKeySecret: ali.accessKeySecret,
        secure: true,
        bucket: ali.bucketName,
        callbackUrl: "http://localhost:3000/oss/result",
      };
      this.aliClient = new Client(this.aliConfig);

      this.staticConfig = {
        region: ali.endpoint,
        accessKeyId: ali.accessKeyId,
        accessKeySecret: ali.accessKeySecret,
        bucket: "staticolgstorage",
        callbackUrl: "http://localhost:3000/oss/result",
      };
      this.staticClient = new Client(this.staticConfig);

      this.OCRConfig = new $OpenApi.Config({
        accessKeyId: ali.accessKeyId,
        accessKeySecret: ali.accessKeySecret,
        endpoint: ali.endpoint,
      });
      this.OCRClient = new ocr_api20210707(this.OCRConfig);
    }

    // S3(RustFS) 初始化
    if (this.ossType === "s3") {
      const s3 = ossConf.s3;

      this.s3Config = s3;
      this.s3Bucket = s3.bucketName;
      this.s3Client = new S3Client({
        endpoint: s3.endpoint,
        region: s3.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: s3.accessKey,
          secretAccessKey: s3.secretKey,
        },
      });
    }
  }

  //  定义两个存储桶连接
  async getSignature() {
    // 阿里云 OSS：保持原有签名行为
    if (this.ossType === "aliyun") {
      const date = new Date();
      date.setDate(date.getDate() + 1);

      const policy = {
        expiration: date.toISOString(),
        conditions: [["content-length-range", 0, 10485760000]],
      };

      const formData = await this.aliClient.calculatePostSignature(policy);
      const location = await this.aliClient.getBucketLocation(this.aliConfig.bucket);
      const host = `https://${this.aliConfig.bucket}.${location.location}.aliyuncs.com`;

      const callback = {
        callbackUrl: this.aliConfig.callbackUrl,
        callbackBody:
          "filename=${object}&size=${size}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}",
        callbackBodyType: "application/x-www-form-urlencoded",
      };

      return {
        expire: dayjs().add(1, "days").unix().toString(),
        policy: formData.policy,
        signature: formData.Signature,
        accessId: formData.OSSAccessKeyId,
        host,
        dir: this.aliConfig.dir,
        callback: Buffer.from(JSON.stringify(callback)).toString("base64"),
      };
    }

    // S3(RustFS)：返回预签名上传 URL（PUT），前端直接向该 URL 上传文件
    if (this.ossType === "s3" && this.s3Client && this.s3Bucket) {
      const objectPrefix = `uploads/${dayjs().format("YYYY/MM/DD")}/`;
      const objectName = `${objectPrefix}`; // 前端需要自行替换为具体文件名

      // 预签名 URL 有效期（秒）
      const expires = 24 * 60 * 60;
      const uploadUrl = await getSignedUrl(
        this.s3Client,
        new PutObjectCommand({ Bucket: this.s3Bucket, Key: objectName }),
        { expiresIn: expires }
      );

      return {
        type: "s3",
        bucket: this.s3Bucket,
        objectPrefix,
        uploadUrl,
        expires,
      };
    }

    // 其他类型（local）暂不提供前端直传签名
    return {
      type: this.ossType,
      message: "current OSS type does not support direct upload signature",
    };
  }

  async getstaticSignature() {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    const policy = {
      expiration: date.toISOString(),
      conditions: [["content-length-range", 0, 10485760000]],
    };

    const formData = await this.staticClient.calculatePostSignature(policy);
    const location = await this.staticClient.getBucketLocation("staticolgstorage");
    const host = `https://${this.staticConfig.bucket}.${location.location}.aliyuncs.com`;

    const callback = {
      callbackUrl: this.staticConfig.callbackUrl,
      callbackBody:
        "filename=${object}&size=${size}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}",
      callbackBodyType: "application/x-www-form-urlencoded",
    };

    return {
      expire: dayjs().add(1, "days").unix().toString(),
      policy: formData.policy,
      signature: formData.Signature,
      accessId: formData.OSSAccessKeyId,
      host,
      dir: this.staticConfig.dir,
      callback: Buffer.from(JSON.stringify(callback)).toString("base64"),
    };
  }

  async generateSignedUrl(key: string): Promise<string> {
    const expire = Math.floor(Date.now() / 1000) + 3600; // 有效期为1小时

    // 阿里云 OSS
    if (this.ossType === "aliyun") {
      const downloadUrl = this.aliClient.signatureUrl(key, {
        expires: expire,
      });
      return downloadUrl;
    }

    // S3(RustFS)
    if (this.ossType === "s3" && this.s3Client && this.s3Bucket) {
      const url = await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({ Bucket: this.s3Bucket, Key: key }),
        { expiresIn: 3600 }
      );
      return url;
    }

    // local 或未配置
    throw new Error("generateSignedUrl is not supported for current OSS type");
  }

  async getFileAsBlob(key: string): Promise<Buffer> {
    try {
      // 阿里云 OSS
      if (this.ossType === "aliyun") {
        const result = await this.aliClient.get(key);
        const buffer = Buffer.from(result.content, "base64");
        return buffer;
      }

      // S3(RustFS)
      if (this.ossType === "s3" && this.s3Client && this.s3Bucket) {
        const res = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.s3Bucket, Key: key })
        );
        const stream = res.Body!.transformToWebStream();
        const reader = stream.getReader();
        const chunks: Buffer[] = [];
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
        }
        return Buffer.concat(chunks);
      }

      throw new Error("getFileAsBlob is not supported for current OSS type");
    } catch (error) {
      throw new Error(`Error getting file: ${error.message}`);
    }
  }

  async getResult(xOssPubKeyUrl: string, file: any) {
    // 通过 Base64 解码公钥地址
    const pubKeyAddr = Buffer.from(xOssPubKeyUrl, "base64").toString("ascii");

    //  判断请求头中的 x-oss-pub-key-url 是否来源于OSS服务器
    if (!pubKeyAddr.startsWith("https://gosspublic.alicdn.com/")) {
      // 如果不是来源于OSS服务器，则返回 “verify not ok”，表明回调失败
      return {
        status: "verify not ok",
      };
    }
    // 如果 x-oss-pub-key-url 来源于OSS服务器，则返回“Ok”和文件信息，表明回调成功
    return {
      status: "Ok",
      file,
    };
  }

  async uploadFile(file: any): Promise<{ name: string; url: string }> {
    const originalName: string = file?.originalname || file?.originalName || "file";

    // 扩展名 + 大小白名单校验
    const rawExt = originalName.includes(".") ? originalName.split(".").pop()! : "";
    const ext = rawExt.toLowerCase();
    const allowed = this.ossConf.upload?.allowedExtensions || [];
    if (allowed.length > 0 && !allowed.includes(ext)) {
      throw new Error(`不支持的文件类型: .${ext || "未知"}`);
    }
    const maxSize = this.ossConf.upload?.maxFileSize || 50 * 1024 * 1024;
    if (file?.size && file.size > maxSize) {
      throw new Error(`文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    }

    const dateFolder = dayjs().format("YYYYMMDD");
    const objectName = `${dateFolder}/${uuidv4()}.${ext}`;

    const getFileContent = async () => {
      if (file?.buffer) {
        return file.buffer as Buffer;
      }
      if (file?.path) {
        return (await fs.promises.readFile(file.path)) as Buffer;
      }
      return null;
    };

    // aliyun
    if (this.ossType === "aliyun") {
      const content = (await getFileContent()) ?? file;
      const result = await this.aliClient.put(objectName, content);
      const endpoint = this.ossConf.aliyun.endpoint;
      const bucket = this.ossConf.aliyun.bucketName;
      const url = result?.url || `https://${bucket}.${endpoint}/${objectName}`;
      return { name: originalName, url };
    }

    // s3
    if (this.ossType === "s3" && this.s3Client && this.s3Bucket) {
      const content = await getFileContent();
      if (!content) {
        throw new Error("file buffer is empty");
      }

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: objectName,
          Body: content,
          ContentType: file?.mimetype || "application/octet-stream",
        })
      );

      const customDomain = (this.ossConf.s3.customDomain || "").trim();
      if (customDomain) {
        const base = customDomain.replace(/\/+$/, "");
        return {
          name: originalName,
          url: `${base}/${this.s3Bucket}/${objectName}`,
        };
      }

      const presigned = await getSignedUrl(
        this.s3Client,
        new GetObjectCommand({ Bucket: this.s3Bucket, Key: objectName }),
        { expiresIn: 24 * 60 * 60 }
      );
      const cleanUrl = presigned.includes("?")
        ? presigned.substring(0, presigned.indexOf("?"))
        : presigned;
      return { name: originalName, url: cleanUrl };
    }

    // local
    const storageRoot = this.ossConf.local.storagePath;
    const fullPath = path.join(storageRoot, objectName);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    const content = await getFileContent();
    if (!content) {
      throw new Error("file buffer is empty");
    }
    await fs.promises.writeFile(fullPath, content);
    return { name: originalName, url: `/${objectName}` };
  }

  async deleteFile(filePath?: string): Promise<boolean> {
    if (!filePath) return false;

    // aliyun
    if (this.ossType === "aliyun") {
      const endpoint = this.ossConf.aliyun.endpoint;
      const bucket = this.ossConf.aliyun.bucketName;
      const host = `https://${bucket}.${endpoint}`;

      const key = filePath.startsWith(host)
        ? filePath.substring(host.length + 1)
        : filePath.startsWith("http")
          ? new URL(filePath).pathname.replace(/^\/+/, "")
          : filePath.replace(/^\/+/, "");

      await this.aliClient.delete(key);
      return true;
    }

    // local
    try {
      const storageRoot = this.ossConf.local.storagePath;
      const rel = filePath.startsWith("/") ? filePath.substring(1) : filePath;
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(storageRoot, rel);
      await fs.promises.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async OCR(url: string, type: string) {
    const recognizeIdcardRequest = new $ocr_api20210707.RecognizeAllTextRequest({
      url,
      type,
    });
    const runtime = new $Util.RuntimeOptions({});
    try {
      if (!this.OCRClient) {
        return {
          data: JSON.stringify({
            code: 400,
            message: "OCR is only supported when OSS_TYPE=aliyun",
          }),
        };
      }

      const res = await this.OCRClient.recognizeAllTextWithOptions(recognizeIdcardRequest, runtime);

      return res?.body?.data;
    } catch (error) {
      Util.assertAsString(error.message);
      if (error.message.indexOf("illegalImageContent") !== -1) {
        return {
          data: JSON.stringify({
            code: 400,
            message: "非法图像内容,请上传正确图片",
          }),
        };
      }
    }
  }
}
