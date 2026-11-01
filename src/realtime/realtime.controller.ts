import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/auth.decorator";
import { RealtimeService } from "./realtime.service";
import { REALTIME_TOPICS, SUPPORTED_TOPICS } from "./realtime.types";

@ApiTags("13. 实时推送")
@ApiBearerAuth()
@Controller("realtime")
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  /** 签发一次性握手票据，票据 30 秒内有效且只能使用一次 */
  @Public()
  @Post("tickets")
  @ApiOperation({ summary: "签发实时连接票据" })
  async createTicket(
    @Body() body: { clientInstanceId?: string; platform?: string; topics?: string[] },
    @Headers("authorization") authorization?: string
  ) {
    const topics = Array.isArray(body?.topics) ? body.topics : [];
    if (!topics.includes(REALTIME_TOPICS.NOTICE)) {
      return { code: 400, msg: "订阅主题须包含 notice" };
    }

    const unsupported = topics.filter((topic) => !SUPPORTED_TOPICS.includes(topic));
    if (unsupported.length > 0) {
      return { code: 400, msg: `不支持的订阅主题：${unsupported.join(", ")}` };
    }

    if (!authorization?.startsWith("Bearer ")) {
      return { code: 401, msg: "Unauthorized" };
    }

    const accessToken = authorization.slice(7);
    try {
      const secret = this.configService.getOrThrow<string>("jwt.secretKey");
      const payload = await this.jwtService.verifyAsync(accessToken, { secret });
      if (!payload.username) {
        return { code: 401, msg: "Invalid token" };
      }
      const ticket = await this.realtimeService.createTicket(payload.username, accessToken, topics);
      return { code: 200, msg: "操作成功", data: { ticket } };
    } catch {
      return { code: 401, msg: "Invalid token" };
    }
  }

  /** 查询当前节点在线状态 */
  @Get("presence")
  @ApiOperation({ summary: "获取在线状态" })
  getPresence() {
    return {
      code: 200,
      msg: "操作成功",
      data: this.realtimeService.presenceSnapshot(),
    };
  }
}