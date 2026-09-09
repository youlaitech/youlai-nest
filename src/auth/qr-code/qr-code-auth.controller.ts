import { Controller, Post, Get, Body, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { QrCodeAuthService } from "./qr-code-auth.service";
import { Public } from "../../common/decorators/auth.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

/**
 * 扫码登录接口
 */
@ApiTags("01.认证中心")
@Controller("auth/qr-code")
export class QrCodeAuthController {
  constructor(private readonly qrCodeAuthService: QrCodeAuthService) {}

  @ApiOperation({ summary: "生成扫码登录票据" })
  @Public()
  @Post("generate")
  async generate(@Req() req: any) {
    const clientIp =
      (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() ||
      (req.headers["x-real-ip"] ?? "").trim() ||
      (req.ip ?? "unknown");
    return this.qrCodeAuthService.generate(clientIp);
  }

  @ApiOperation({ summary: "查询扫码状态" })
  @Public()
  @Get("status")
  async status(@Query("ticket") ticket: string) {
    return this.qrCodeAuthService.status(ticket);
  }

  @ApiOperation({ summary: "APP 标记已扫码" })
  @Post("scan")
  async scan(@Body("ticket") ticket: string, @CurrentUser("userId") userId: number) {
    return this.qrCodeAuthService.scan(ticket, userId);
  }

  @ApiOperation({ summary: "APP 确认登录" })
  @Post("confirm")
  async confirm(@Body("ticket") ticket: string, @CurrentUser("userId") userId: number) {
    return this.qrCodeAuthService.confirm(ticket, userId);
  }

  @ApiOperation({ summary: "APP 取消登录" })
  @Post("cancel")
  async cancel(@Body("ticket") ticket: string, @CurrentUser("userId") userId: number) {
    return this.qrCodeAuthService.cancel(ticket, userId);
  }

  @ApiOperation({ summary: "PC 端换取会话令牌" })
  @Public()
  @Post("login")
  async login(@Body("ticket") ticket: string) {
    return this.qrCodeAuthService.login(ticket);
  }
}
