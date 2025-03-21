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
import { METADATA_NOT_CHECK } from "../decorator/not_check";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { getReqMainInfo } from "../../utils/utils";
/** 每次请求的记数器 */
let requestSeq = 0;

/**
 * 全局拦截器类
 */
@Injectable()
export class XRequestInterceptor implements NestInterceptor {
  // 注入日志服务相关依赖
  @Inject(WINSTON_MODULE_PROVIDER)
  private logger: Logger;
  constructor(private reflector: Reflector) {
    //
  }
  /**
   * 拦截器入口
   * @param paramContext 上下文对象
   * @param paramNext 后续调用函数
   * @returns
   */
  intercept(paramContext: ExecutionContext, paramNext: CallHandler): Observable<any> {
    /** 请求开始时间 */
    const start = Date.now();
    /** 当前环境 */
    const host = paramContext.switchToHttp();
    /** 请求对象 */
    const req = host.getRequest<Request>();
    /** 响应对象 */
    const res = host.getResponse<Response>();
    /** 当前计数 */
    const seq = requestSeq++;
    /** 当前URL */
    const url = req.url; // req.path;
    /** 当前URL */
    const urlInfo = `${req.method} ${url}`;

    // log.info(`[${seq}]==> ${urlInfo}`);

    req["seq"] = seq;

    const isNotCheck = this.reflector.get<boolean>(METADATA_NOT_CHECK, paramContext.getHandler());
    const isCheckAPI = isNotCheck !== true; // XCommUtils.hasStartsWith(url, urlPrefix.API);

    if (isCheckAPI) {
      return paramNext
        .handle()
        .pipe(
          map((paramData) => {
            /* 这里拦截POST返回的statusCode，它默认返回是201, 这里改为200 */
            this.logger.info("response", {
              responseData: paramData,
              req: getReqMainInfo(req),
            });
            if (res.statusCode === HttpStatus.CREATED && req.method === "POST") {
              res.statusCode = HttpStatus.OK;
            }
            // 这里要求所有的请求返回，都是XCommonRet
            if (paramData instanceof XCommonRet) {
              const data = utils.isNull(paramData.data) ? undefined : paramData.data;
              return {
                ret: paramData.err,
                msg: paramData.msg,
                data,
              };
            } else if (paramData === undefined) {
              this.logger.error("--------- data is undefine!");
              return paramData;
            } else {
              return paramData;
            }
          })
        )
        .pipe(
          // 这里打印请求处理完成的信息
          tap(() => {
            this.logger.info(`[${seq}]<== ${urlInfo} ${Date.now() - start} ms`);
          })
        );
    } else {
      this.logger.info("response", {
        responseData: paramNext,
        req: getReqMainInfo(req),
      });
      return paramNext.handle().pipe(
        // 这里打印请求处理完成的信息
        tap(() => this.logger.info(`[${seq}]<== ${urlInfo} ${Date.now() - start} ms`))
      );
    }
  }
}
