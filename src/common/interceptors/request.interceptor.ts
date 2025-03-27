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
import { METADATA_NOT_CHECK } from "../decorators/not_check.decorator";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { LoggerUtils } from "../../utils/logger.utils";

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
    const urlInfo = `${req.method} ${req.url}`;

    req["seq"] = seq;

    const isCheckAPI = !this.reflector.get<boolean>(METADATA_NOT_CHECK, context.getHandler());

    // 日志记录保持原始数据
    const logRequest = () => ({
      request: LoggerUtils.captureRequestContext(req),
      latency: Date.now() - startTime,
    });

    return next.handle().pipe(
      map((data) => {
        // 核心修改点：移除数据过滤
        if (isCheckAPI) {
          this.logger.info("API Response", {
            ...logRequest(),
            response: data, // 直接记录原始数据
          });

          if (res.statusCode === HttpStatus.CREATED && req.method === "POST") {
            res.statusCode = HttpStatus.OK;
          }
        }

        // 保持原有结构逻辑
        return data instanceof XCommonRet
          ? this.formatXCommonRet(data) // 移除过滤处理
          : data;
      }),
      tap(() => {
        this.logger.info(`Request ${seq} Completed`, {
          ...logRequest(),
          statusCode: res.statusCode,
        });
      })
    );
  }

  // 保持原有格式化逻辑（无敏感数据处理）
  private formatXCommonRet(paramData: XCommonRet) {
    return {
      ret: paramData.err,
      msg: paramData.msg,
      data: utils.isNull(paramData.data) ? undefined : paramData.data,
    };
  }
}
