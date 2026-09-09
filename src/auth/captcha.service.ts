import { Injectable } from "@nestjs/common";
import * as svgCaptcha from "svg-captcha";
import { v4 as uuidv4 } from "uuid";

import { RedisService } from "../common/redis/redis.service";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";

/** 图形验证码在 Redis 中的键前缀 */
const CAPTCHA_KEY_PREFIX = "captcha:image";
/** 验证码有效期（秒），与登录接口配套 */
const CAPTCHA_TTL = 120;

/**
 * 图形验证码服务：生成、缓存与校验
 */
@Injectable()
export class CaptchaService {
  constructor(private readonly redisService: RedisService) {}

  /** 生成图形验证码并缓存文本，返回前端所需 base64 与验证码 ID */
  async generate() {
    const captcha = svgCaptcha.create({
      size: 4,
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

    const captchaId = uuidv4();
    await this.redisService.set(`${CAPTCHA_KEY_PREFIX}:${captchaId}`, captcha.text, CAPTCHA_TTL);

    return {
      captchaBase64: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      captchaId,
      captchaCode: captcha.text,
    };
  }

  /** 校验图形验证码，大小写不敏感 */
  async verify(captchaId: string, captchaCode: string): Promise<void> {
    const cached = await this.redisService.get<string>(`${CAPTCHA_KEY_PREFIX}:${captchaId}`);

    if (!cached) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_EXPIRED);
    }

    if (captchaCode?.toUpperCase() !== cached?.toUpperCase()) {
      throw new BusinessException(ErrorCode.USER_VERIFICATION_CODE_ERROR);
    }
  }
}
