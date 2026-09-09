import { Injectable } from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";
import { RedisService } from "../../common/redis/redis.service";
import { RedisConstants } from "../../common/constants/redis.constants";
import { UserService } from "../../system/user/user.service";
import { AuthService } from "../auth.service";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ErrorCode } from "../../common/enums/error-code.enum";
import type { LoginResultDto } from "../dto/login-result.dto";

/** 扫码登录状态 */
const STATUS = {
  WAITING: "WAITING",
  SCANNED: "SCANNED",
  CONFIRMED: "CONFIRMED",
  LOGGED_IN: "LOGGED_IN",
  CANCELED: "CANCELED",
  EXPIRED: "EXPIRED",
} as const;

/** 票据有效期（秒） */
const DEFAULT_EXPIRE = 300;
/** 状态流转时最小补足 TTL（秒） */
const MIN_REMAIN = 30;

/**
 * 票据上下文
 */
interface QrCodeContext {
  ticket: string;
  status: string;
  userId?: number | null;
  nickname?: string | null;
  avatar?: string | null;
  createdAt?: number | null;
  scannedAt?: number | null;
  confirmedAt?: number | null;
  clientIp?: string | null;
}

/**
 * 扫码登录服务：管理票据上下文与状态流转，PC 端换发令牌委托给 {@link AuthService.loginByQr}。
 */
@Injectable()
export class QrCodeAuthService {
  constructor(
    private readonly redis: RedisService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  private qrKey(ticket: string): string {
    return `${RedisConstants.Auth.QR_CODE}:${ticket}`;
  }

  async generate(clientIp: string): Promise<{ ticket: string; expireSeconds: number }> {
    const ticket = uuidv4().replace(/-/g, "");
    const ctx: QrCodeContext = {
      ticket,
      status: STATUS.WAITING,
      userId: null,
      nickname: null,
      avatar: null,
      createdAt: Date.now(),
      scannedAt: null,
      confirmedAt: null,
      clientIp,
    };
    await this.redis.set(this.qrKey(ticket), ctx, DEFAULT_EXPIRE);
    return { ticket, expireSeconds: DEFAULT_EXPIRE };
  }

  async status(ticket: string) {
    const ctx = await this.loadCtx(ticket);
    return this.toStatusVO(ctx, await this.remainSeconds(ticket));
  }

  async scan(ticket: string, userId: number) {
    const ctx = await this.loadCtx(ticket);
    if (ctx.status !== STATUS.WAITING) {
      throw new BusinessException(ErrorCode.QR_CODE_STATUS_ILLEGAL);
    }
    const info = await this.userService.getAuthInfoByUserId(userId);
    if (!info) {
      throw new BusinessException(ErrorCode.ACCOUNT_NOT_FOUND);
    }
    ctx.userId = userId;
    ctx.nickname = info.nickname ?? null;
    ctx.avatar = info.avatar ?? null;
    ctx.status = STATUS.SCANNED;
    ctx.scannedAt = Date.now();
    await this.save(ctx, await this.refreshTtl(ticket));
    return this.toStatusVO(ctx, await this.remainSeconds(ticket));
  }

  async confirm(ticket: string, userId: number) {
    const ctx = await this.loadCtx(ticket);
    if (ctx.status !== STATUS.SCANNED) {
      throw new BusinessException(ErrorCode.QR_CODE_STATUS_ILLEGAL);
    }
    if (ctx.userId == null || ctx.userId !== userId) {
      throw new BusinessException(ErrorCode.QR_CODE_USER_MISMATCH);
    }
    ctx.status = STATUS.CONFIRMED;
    ctx.confirmedAt = Date.now();
    await this.save(ctx, await this.refreshTtl(ticket));
    return this.toStatusVO(ctx, await this.remainSeconds(ticket));
  }

  async cancel(ticket: string, userId: number) {
    const ctx = await this.loadCtx(ticket);
    if (
      ctx.status !== STATUS.WAITING &&
      ctx.status !== STATUS.SCANNED &&
      ctx.status !== STATUS.CONFIRMED
    ) {
      throw new BusinessException(ErrorCode.QR_CODE_STATUS_ILLEGAL);
    }
    if (ctx.status !== STATUS.WAITING && ctx.userId != null && ctx.userId !== userId) {
      throw new BusinessException(ErrorCode.QR_CODE_USER_MISMATCH);
    }
    ctx.status = STATUS.CANCELED;
    await this.save(ctx, await this.refreshTtl(ticket));
    return this.toStatusVO(ctx, await this.remainSeconds(ticket));
  }

  async login(ticket: string): Promise<LoginResultDto> {
    const ctx = await this.loadCtx(ticket);
    if (ctx.status !== STATUS.CONFIRMED) {
      throw new BusinessException(ErrorCode.QR_CODE_STATUS_ILLEGAL);
    }
    const token = await this.authService.loginByQr(String(ctx.userId));
    // 换取令牌成功后立即把票据置为已使用（一次性），再次 login 会在状态校验处被拒，杜绝重放
    ctx.status = STATUS.LOGGED_IN;
    const remain = await this.remainSeconds(ticket);
    await this.save(ctx, remain > MIN_REMAIN ? remain : MIN_REMAIN);
    return token;
  }

  // ======================== private ========================

  private async loadCtx(ticket: string): Promise<QrCodeContext> {
    if (!ticket) {
      throw new BusinessException(ErrorCode.QR_CODE_NOT_FOUND);
    }
    const ctx = await this.redis.get<QrCodeContext>(this.qrKey(ticket));
    if (!ctx) {
      throw new BusinessException(ErrorCode.QR_CODE_NOT_FOUND);
    }
    return ctx;
  }

  private async save(ctx: QrCodeContext, ttl: number): Promise<void> {
    await this.redis.set(this.qrKey(ctx.ticket), ctx, ttl);
  }

  /** 票据剩余秒数（过期返回 0） */
  private async remainSeconds(ticket: string): Promise<number> {
    try {
      const ttl = await this.redis.getClient().ttl(this.qrKey(ticket));
      return ttl > 0 ? ttl : 0;
    } catch {
      return 0;
    }
  }

  /** 状态流转后写回的 TTL：维持剩余时间，不足最小补足值则补足 */
  private async refreshTtl(ticket: string): Promise<number> {
    const remain = await this.remainSeconds(ticket);
    return remain < MIN_REMAIN ? MIN_REMAIN : remain;
  }

  /** 上下文转前端 VO；仅 SCANNED/CONFIRMED 阶段回传脱敏昵称与头像 */
  private toStatusVO(ctx: QrCodeContext, expireSeconds: number) {
    const vo: any = {
      ticket: ctx.ticket,
      status: ctx.status,
      nickname: null,
      avatar: null,
      expireSeconds,
    };
    if (ctx.status === STATUS.SCANNED || ctx.status === STATUS.CONFIRMED) {
      vo.nickname = ctx.nickname ? this.maskNickname(ctx.nickname) : null;
      vo.avatar = ctx.avatar ?? null;
    }
    return vo;
  }

  /** 昵称脱敏：保留首尾字符，中间以 * 填充 */
  private maskNickname(nickname: string): string {
    const chars = Array.from(nickname);
    const n = chars.length;
    if (n <= 1) return nickname;
    if (n === 2) return chars[0] + "*";
    return chars[0] + "*".repeat(n - 2) + chars[n - 1];
  }
}
