import { Body, Controller, Headers, Get, Post, Query } from "@nestjs/common";
import { OssService } from "./oss.service";
import { ApiTags } from "@nestjs/swagger";
import { Permissions, Public } from "src/common/decorators/public.decorator";

/**
 * 对象存储接口控制器
 */
@ApiTags("08.对象存储")
@Controller("oss")
export class OssController {
  constructor(private oss: OssService) {}

  @Get("signature")
  getOssSignature() {
    return this.oss.getSignature();
  }
  @Get("staticsignature")
  getstaticOssSignature() {
    return this.oss.getstaticSignature();
  }
  @Get("download")
  @Permissions("sys:file:download")
  async downloadPrivateFile(@Query("key") key: string) {
    const signedUrl = await this.oss.generateSignedUrl(key);
    return { url: signedUrl }; // 重定向到签名URL
  }

  @Get("getFileAsBlob")
  @Permissions("sys:file:get")
  async getFileAsBlob(@Query("key") key: string) {
    const data = await this.oss.getFileAsBlob(key);
    return data;
  }

  @Post("result")
  @Permissions("sys:file:result")
  @Public()
  getResult(@Headers("x-oss-pub-key-url") xOssPubKeyUrl: string, @Body() file: any) {
    return this.oss.getResult(xOssPubKeyUrl, file);
  }
  @Post("ORC")
  // @Public()
  async REDOR(@Body() Body: any) {
    const { url, type } = Body;
    return await this.oss.ORC(url, type);
  }
}
