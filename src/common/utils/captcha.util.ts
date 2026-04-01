import { Injectable } from "@nestjs/common";
import * as svgCaptcha from "svg-captcha";

@Injectable()
export class ToolsService {
  async captche(size = 4) {
    const captcha = svgCaptcha.create({
      // 验证码视觉参数
      size,
      fontSize: 38,
      width: 140,
      height: 44,
      background: "#f6f9ff",
      color: false,
      noise: 1,
      charPreset: "23456789",
    });
    const svg = captcha.data
      .replace(/<text([^>]*?)fill="[^"]*"([^>]*?)>/g, '<text$1fill="#4b6fdc"$2>')
      .replace(/<text(?![^>]*fill=)/g, '<text fill="#4b6fdc"')
      .replace(/<path([^>]*?)stroke="[^"]*"([^>]*?)>/g, '<path$1stroke="#c7d5ff"$2>')
      .replace(/<path(?![^>]*stroke=)/g, '<path stroke="#c7d5ff"')
      .replace(/<line([^>]*?)stroke="[^"]*"([^>]*?)>/g, '<line$1stroke="#c7d5ff"$2>')
      .replace(/<line(?![^>]*stroke=)/g, '<line stroke="#c7d5ff"');
    const base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
    return { captcha, base64 };
  }
}
