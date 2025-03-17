import { Injectable } from "@nestjs/common";
import * as svgCaptcha from "svg-captcha";

@Injectable()
export class ToolsService {
  async captche(size = 4) {
    const captcha = svgCaptcha.create({
      //可配置返回的图片信息
      size, //生成几个验证码
      fontSize: 50, //文字大小
      width: 120, //宽度
      height: 48, //高度
      background: "#e4e7ed", //背景颜色
      charPreset: "1234567890",
    });
    const svg = captcha.data;
    const base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return { captcha, base64 };
  }
}
