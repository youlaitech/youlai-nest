import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, map } from "rxjs/operators";
import { Response, Request } from "express";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { LoggerUtils, maskBody } from "../../common/utils/logger.utils";

let requestSeq = 0;

@Injectable()
export class XRequestInterceptor implements NestInterceptor {
  @Inject(WINSTON_MODULE_PROVIDER)
  private logger: Logger;

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const seq = requestSeq++;

    req["seq"] = seq;

    const isCheckAPI = !this.reflector.get<boolean>(IS_PUBLIC_KEY, context.getHandler());

    // 请求上下文按脱敏规则记录，响应体同样脱敏
    const logRequest = () => ({
      request: LoggerUtils.captureRequestContext(req),
      latency: Date.now() - startTime,
    });

    return next.handle().pipe(
      map((data) => {
        if (isCheckAPI) {
          this.logger.info("API Response", {
            ...logRequest(),
            response: maskBody(data as Record<string, unknown>),
          });

          if (res.statusCode === HttpStatus.CREATED && req.method === "POST") {
            res.statusCode = HttpStatus.OK;
          }
        }

        return data;
      }),
      tap(() => {
        this.logger.info(`Request ${seq} Completed`, {
          ...logRequest(),
          statusCode: res.statusCode,
        });
      })
    );
  }
}
