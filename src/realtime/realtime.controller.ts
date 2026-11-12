import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/auth.decorator";
import { BusinessException } from "../common/exceptions/business.exception";
import { ErrorCode } from "../common/enums/error-code.enum";
import { RealtimeService } from "./realtime.service";
import { REALTIME_TOPICS, SUPPORTED_TOPICS } from "./realtime.types";

/** 单次订阅主题上限，避免异常客户端占用过多服务端资源 */
const MAX_TOPICS = 20;

@ApiTags("13. 实时推送")
@ApiBearerAuth()
@Controller("realtime")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

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
      throw new BusinessException(ErrorCode.USER_REQUEST_PARAMETER_ERROR);
    }
    if (topics.length > MAX_TOPICS) {
      throw new BusinessException(ErrorCode.USER_REQUEST_PARAMETER_ERROR);
    }
    const unsupported = topics.filter((topic) => !SUPPORTED_TOPICS.includes(topic));
    if (unsupported.length > 0) {
      throw new BusinessException(ErrorCode.USER_REQUEST_PARAMETER_ERROR);
    }

    if (!authorization?.startsWith("Bearer ")) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_INVALID);
    }

    const accessToken = authorization.slice(7);
    const username = await this.realtimeService.verifyAccessToken(accessToken);
    if (!username) {
      throw new BusinessException(ErrorCode.ACCESS_TOKEN_INVALID);
    }

    const ticket = await this.realtimeService.createTicket(username, accessToken, topics);
    // 由全局响应拦截器统一包装，直接返回票据
    return { ticket };
  }

  /** 查询当前节点在线状态 */
  @Get("presence")
  @ApiOperation({ summary: "获取在线状态" })
  getPresence() {
    return this.realtimeService.presenceSnapshot();
  }
}
