import { Injectable, Inject } from "@nestjs/common";

import * as Client from "ali-oss";
import * as dayjs from "dayjs";
import { ConfigType } from "@nestjs/config";
import ossConfig from "../../config/oss.config";
import OSS from "ali-oss";
import * as Minio from "minio";
import * as $OpenApi from "@alicloud/openapi-client";
import ocr_api20210707, * as $ocr_api20210707 from "@alicloud/ocr-api20210707";
import Util, * as $Util from "@alicloud/tea-util";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

/**
 * 文件服务（OSS/MinIO/本地存储）
 */
@Injectable()
export class FileService {
  /** 当前 OSS 类型：aliyun | minio | local */
  private readonly ossType: "aliyun" | "minio" | "local";

  /** 阿里云 OSS 客户端及配置（当 ossType=aliyun 时启用） */
  private aliClient: any;
  private aliConfig: Record<string, any>;
  private staticClient: any;
  private staticConfig: Record<string, any>;

  /** MinIO 客户端及配置（当 ossType=minio 时启用） */
  private minioClient: Minio.Client | null = null;
  private minioBucket: string | null = null;
  private minioConfig: Record<string, any> = {};

  // OCR 身份证识别（阿里云）
  private ORCClient: ocr_api20210707 | null = null;
  private OCRConfig: Record<string, any> = {};

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
      this.aliClient = new Client(<OSS.Options>this.aliConfig);

      this.staticConfig = {
        region: ali.endpoint,
        accessKeyId: ali.accessKeyId,
        accessKeySecret: ali.accessKeySecret,
        bucket: "staticolgstorage",
        callbackUrl: "http://localhost:3000/oss/result",
      };
      this.staticClient = new Client(<OSS.Options>this.staticConfig);

      this.OCRConfig = new $OpenApi.Config({
        accessKeyId: ali.accessKeyId,
        accessKeySecret: ali.accessKeySecret,
      });
      this.OCRConfig.endpoint = ali.endpoint;
      this.ORCClient = new ocr_api20210707(<any>this.OCRConfig);
    }

    // MinIO 初始化
    if (this.ossType === "minio") {
      const minio = ossConf.minio;

      // 解析 endpoint
      const url = new URL(minio.endpoint);
      const endPoint = url.hostname;
      const port = Number(url.port) || (url.protocol === "https:" ? 443 : 9000);
      const useSSL = url.protocol === "https:";

      this.minioConfig = {
        endPoint,
        port,
        useSSL,
        accessKey: minio.accessKey,
        secretKey: minio.secretKey,
      };

      this.minioClient = new Minio.Client(this.minioConfig as any);
      this.minioBucket = minio.bucketName;
    }
  }

  //  定义两个存储桶连接
  //  想清楚
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

    // MinIO：返回预签名上传 URL（PUT），前端直接向该 URL 上传文件
    if (this.ossType === "minio" && this.minioClient && this.minioBucket) {
      const objectPrefix = `uploads/${dayjs().format("YYYY/MM/DD")}/`;
      const objectName = `${objectPrefix}`; // 前端需要自行替换为具体文件名

      // 预签名 URL 有效期（秒）
      const expires = 24 * 60 * 60;
      const uploadUrl = await this.minioClient.presignedPutObject(
        this.minioBucket,
        objectName,
        expires
      );

      return {
        type: "minio",
        bucket: this.minioBucket,
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
    // const client = new Client(config);

    const date = new Date();
    // 时长加 1 天，作为签名的有限期
    date.setDate(date.getDate() + 1);

    const policy = {
      // 设置签名的有效期，格式为Unix时间戳
      expiration: date.toISOString(),
      conditions: [
        ["content-length-range", 0, 10485760000], // 设置上传文件的大小限制
      ],
    };

    // 生成签名，策略等信息
    const formData = await this.staticClient.calculatePostSignature(policy);

    // bucket域名，客户端将向此地址发送请求
    const location = await this.staticClient.getBucketLocation("staticolgstorage");
    const host = `https://${this.staticConfig.bucket}.${location.location}.aliyuncs.com`;

    // 上传回调。
    const callback = {
      // 设置回调请求的服务器地址
      callbackUrl: this.staticConfig.callbackUrl,
      // 设置回调的内容，${object} 等占位符会由 OSS 进行填充
      // ${object}表示文件的存储路径，${mimeType}表示资源类型，对于图片类型的文件，可以通过${imageInfo.height}等去设置宽高信息
      callbackBody:
        "filename=${object}&size=${size}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}",
      // 设置回调的内容类型，也支持 application/json
      callbackBodyType: "application/x-www-form-urlencoded",
    };

    // 响应给客户端的签名和策略等信息
    return {
      expire: dayjs().add(1, "days").unix().toString(),
      policy: formData.policy,
      signature: formData.Signature,
      accessId: formData.OSSAccessKeyId,
      host,
      dir: this.staticConfig.dir,
      // 传给客户端的回调参数，需要通过Buffer.from 对 JSON 进行 Base64 编码
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

    // MinIO
    if (this.ossType === "minio" && this.minioClient && this.minioBucket) {
      const url = await this.minioClient.presignedGetObject(this.minioBucket, key, 3600);
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

      // MinIO
      if (this.ossType === "minio" && this.minioClient && this.minioBucket) {
        const stream = await this.minioClient.getObject(this.minioBucket, key);
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
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
    const ext = path.extname(originalName);
    const dateFolder = dayjs().format("YYYYMMDD");
    const objectName = `${dateFolder}/${uuidv4()}${ext}`;

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

    // minio
    if (this.ossType === "minio" && this.minioClient && this.minioBucket) {
      const content = await getFileContent();
      if (!content) {
        throw new Error("file buffer is empty");
      }

      await this.minioClient.putObject(this.minioBucket, objectName, content, content.length, {
        "Content-Type": file?.mimetype || "application/octet-stream",
      });

      const customDomain = (this.ossConf.minio.customDomain || "").trim();
      if (customDomain) {
        const base = customDomain.replace(/\/+$/, "");
        return {
          name: originalName,
          url: `${base}/${this.minioBucket}/${objectName}`,
        };
      }

      const presigned = await this.minioClient.presignedGetObject(
        this.minioBucket,
        objectName,
        24 * 60 * 60
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

  async ORC(url: string, type: string) {
    // 依赖环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID / ALIBABA_CLOUD_ACCESS_KEY_SECRET
    // STS 方案：https://help.aliyun.com/document_detail/378664.html
    // let client = this.ORCClient();
    // const bodyStream = Stream.readFromFilePath('<your-file-path>');
    const recognizeIdcardRequest = new $ocr_api20210707.RecognizeAllTextRequest({
      // body: bodyStream,
      // outputFigure: true,
      // outputQualityInfo: true,
      url: url,
      type,
      // 'https://lgstorage.oss-cn-qingdao.aliyuncs.com/apartment/houseType/712f9305-651d-4b01-ba57-d26d719960e0323488274767.jpeg?OSSAccessKeyId=LTAI5tR4nrrdyY274G3cnx8V&Expires=3407512152&Signature=jGHaW5duhNbW6i93TfRg4TyeOsA%3D',
    });
    const runtime = new $Util.RuntimeOptions({});
    try {
      // 仅在阿里云 OSS / OCR 可用
      if (!this.ORCClient) {
        return {
          data: JSON.stringify({
            code: 400,
            message: "OCR is only supported when OSS_TYPE=aliyun",
          }),
        };
      }

      const res = await this.ORCClient.recognizeAllTextWithOptions(recognizeIdcardRequest, runtime);

      return res?.body?.data;
    } catch (error) {
      // 错误 message
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
