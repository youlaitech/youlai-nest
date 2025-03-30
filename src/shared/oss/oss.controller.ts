import { Body, Controller, Headers, Get, Post, Query } from "@nestjs/common";
import { OssService } from "./oss.service";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";

@ApiTags("oss模块")
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
  @Public()
  async downloadPrivateFile(@Query("key") key: string) {
    const signedUrl = await this.oss.generateSignedUrl(key);
    return { url: signedUrl }; // 重定向到签名URL
  }

  @Get("getFileAsBlob")
  async getFileAsBlob(@Query("key") key: string) {
    const data = await this.oss.getFileAsBlob(key);
    return data;
  }

  @Post("result")
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
