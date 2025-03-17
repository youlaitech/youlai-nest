import { Injectable } from "@nestjs/common";
import * as Client from "ali-oss";
import * as dayjs from "dayjs";
import { ConfigService } from "@nestjs/config";
import OSS from "ali-oss";
import * as $OpenApi from "@alicloud/openapi-client";
import ocr_api20210707, * as $ocr_api20210707 from "@alicloud/ocr-api20210707";
import Util, * as $Util from "@alicloud/tea-util";

@Injectable()
export class OssService {
  private client: any;
  private config: Record<string, any>;
  private staticClient: any;
  private staticConfig: Record<string, any>;
  // ocr身份证识别
  private ORCClient: ocr_api20210707;
  private OCRConfig: Record<string, any>;

  constructor(private configService: ConfigService) {
    this.config = {
      region: "oss-cn-qingdao",
      accessKeyId: this.configService.get("ALIBABA_CLOUD_ACCESS_OSS_KEY_ID"),
      accessKeySecret: this.configService.get("ALIBABA_CLOUD_ACCESS_OSS_KEY_SECRET"),
      secure: true,
      // 存储桶名字
      bucket: "kaowustorage",
      // 文件存储路径
      // dir: 'cad/',
      // 设置上传回调URL，即回调服务器地址，用于处理应用服务器与OSS之间的通信。
      // OSS会在文件上传完成后，把文件上传信息通过此回调URL发送给应用服务器。
      // 例如callbackUrl填写为https oss-demo.aliyuncs.com:23450。
      callbackUrl: "http://localhost:3000/oss/result",
    };
    this.client = new Client(<OSS.Options>this.config);
    this.staticConfig = {
      region: "oss-cn-qingdao",
      accessKeyId: this.configService.get("ALIBABA_CLOUD_ACCESS_OSS_KEY_ID"),
      accessKeySecret: this.configService.get("ALIBABA_CLOUD_ACCESS_OSS_KEY_SECRET"),
      // 存储桶名字
      bucket: "staticolgstorage",
      // 文件存储路径
      // dir: 'cad/',
      // 设置上传回调URL，即回调服务器地址，用于处理应用服务器与OSS之间的通信。
      // OSS会在文件上传完成后，把文件上传信息通过此回调URL发送给应用服务器。
      // 例如callbackUrl填写为https oss-demo.aliyuncs.com:23450。
      callbackUrl: "http://localhost:3000/oss/result",
    };
    this.staticClient = new Client(<OSS.Options>this.staticConfig);
    this.OCRConfig = new $OpenApi.Config({
      accessKeyId: this.configService.get("ALIBABA_CLOUD_ACCESS_OCR_KEY_ID"),
      accessKeySecret: this.configService.get("ALIBABA_CLOUD_ACCESS_OCR_KEY_SECRET"),
    });
    this.OCRConfig.endpoint = `ocr-api.cn-hangzhou.aliyuncs.com`;
    this.ORCClient = new ocr_api20210707(<any>this.OCRConfig);
  }

  //  定义两个存储桶连接
  //  想清楚
  async getSignature() {
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
    const formData = await this.client.calculatePostSignature(policy);

    // bucket域名，客户端将向此地址发送请求
    const location = await this.client.getBucketLocation("kaowustorage");
    const host = `https://${this.config.bucket}.${location.location}.aliyuncs.com`;

    // 上传回调。
    const callback = {
      // 设置回调请求的服务器地址
      callbackUrl: this.config.callbackUrl,
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
      dir: this.config.dir,
      // 传给客户端的回调参数，需要通过Buffer.from 对 JSON 进行 Base64 编码
      callback: Buffer.from(JSON.stringify(callback)).toString("base64"),
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
    // 构建下载 URL
    const downloadUrl = this.client.signatureUrl(key, {
      expires: expire,
    });

    return downloadUrl;
  }

  async getFileAsBlob(key: string): Promise<Buffer> {
    try {
      // console.log(key);
      const result = await this.client.get(key);
      // console.log(result);
      const buffer = await Buffer.from(result.content, "base64");
      return buffer;
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

  async ORC(url: string, type: string) {
    // 请确保代码运行环境设置了环境变量 ALIBABA_CLOUD_ACCESS_KEY_ID 和 ALIBABA_CLOUD_ACCESS_KEY_SECRET。
    // 工程代码泄露可能会导致 AccessKey 泄露，并威胁账号下所有资源的安全性。以下代码示例使用环境变量获取 AccessKey 的方式进行调用，仅供参考，建议使用更安全的 STS 方式，更多鉴权访问方式请参见：https://help.aliyun.com/document_detail/378664.html
    // let client = this.ORCClient();
    // 需要安装额外的依赖库，直接点击下载完整工程即可看到所有依赖。
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
      // 复制代码运行请自行打印 API 的返回值 recognizeAllTextWithOptions
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
