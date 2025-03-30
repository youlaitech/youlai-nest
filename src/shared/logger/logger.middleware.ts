import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { LoggerUtils } from "../../common/utils/logger.utils";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Inject } from "@nestjs/common";
import { Logger } from "winston";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestContext = LoggerUtils.captureRequestContext(req);

    res.on("finish", () => {
      const responseContext = LoggerUtils.captureResponseContext(res, startTime);

      this.logger.info("HTTP Request Completed", {
        request: requestContext,
        response: responseContext,
        service: "system-service",
        timestamp: new Date().toISOString(),
      });
    });

    next();
  }
}
