import { Controller, Get, Req, Res, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { SseService } from "./sse.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { Public } from "../common/decorators/auth.decorator";

@ApiTags("13. SSE连接")
@ApiBearerAuth()
@Controller("sse")
export class SseController {
  constructor(
    private readonly sseService: SseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  @Public()
  @Get("connect")
  @ApiOperation({ summary: "建立SSE连接" })
  async connect(@Req() req: Request, @Res() res: Response) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ code: 401, msg: "Unauthorized" });
      return;
    }

    const jwtToken = authHeader.slice(7);

    try {
      const secret = this.configService.getOrThrow<string>("jwt.secretKey");
      const payload = await this.jwtService.verifyAsync(jwtToken, { secret });
      const username = payload.username;

      if (!username) {
        res.status(401).json({ code: 401, msg: "Invalid token" });
        return;
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");

      const sendEvent = (eventName: string, data: any) => {
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const emitter = {
        send: sendEvent,
        complete: () => {
          try {
            res.end();
          } catch (_e) {}
        },
      };

      const registry = (this.sseService as any).sessionRegistry;
      registry.userConnected(username, emitter);

      sendEvent("online-count", registry.getOnlineUserCount());

      const heartbeatInterval = setInterval(() => {
        try {
          res.write(": heartbeat\n\n");
        } catch (_e) {
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      req.on("close", () => {
        clearInterval(heartbeatInterval);
        registry.removeEmitter(emitter);
        this.sseService.sendOnlineCount();
      });
    } catch (_e) {
      res.status(401).json({ code: 401, msg: "Invalid token" });
    }
  }

  @Get("online-count")
  @ApiOperation({ summary: "获取在线用户数" })
  getOnlineCount() {
    return this.sseService.getOnlineUserCount();
  }
}
