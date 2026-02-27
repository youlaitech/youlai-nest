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
import { utils, XCommonRet } from "xmcommon";
import { Response, Request } from "express";
import { Reflector } from "@nestjs/core";
import { METADATA_NOT_CHECK } from "../../common/decorators/not_check.decorator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { LoggerUtils } from "../../common/utils/logger.utils";

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

    const isCheckAPI = !this.reflector.get<boolean>(METADATA_NOT_CHECK, context.getHandler());

    // 日志记录保持原始数据
    const logRequest = () => ({
      request: LoggerUtils.captureRequestContext(req),
      latency: Date.now() - startTime,
    });

    return next.handle().pipe(
      map((data) => {
        if (isCheckAPI) {
          this.logger.info("API Response", {
            ...logRequest(),
            response: data,
          });

          if (res.statusCode === HttpStatus.CREATED && req.method === "POST") {
            res.statusCode = HttpStatus.OK;
          }
        }

        return data instanceof XCommonRet ? this.formatXCommonRet(data) : data;
      }),
      tap(() => {
        this.logger.info(`Request ${seq} Completed`, {
          ...logRequest(),
          statusCode: res.statusCode,
        });
      })
    );
  }

  private formatXCommonRet(paramData: XCommonRet) {
    return {
      ret: paramData.err,
      msg: paramData.msg,
      data: utils.isNull(paramData.data) ? undefined : paramData.data,
    };
  }
}
