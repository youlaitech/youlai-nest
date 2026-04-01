import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysLog } from "./entities/sys-log.entity";
import { LOG_MODULE, LogMetadata } from "../../common/decorators/log.decorator";
import { ActionTypeEnum } from "../../common/enums/action-type.enum";
import { LogModuleEnum } from "../../common/enums/log-module.enum";
import { parseUserAgent } from "../../common/utils/user-agent.util";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(SysLog)
    private readonly logRepository: Repository<SysLog>,
    private readonly reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const now = Date.now();
    const http = context.switchToHttp();
    const req: any = http.getRequest();

    return next.handle().pipe(
      tap(async () => {
        await this.saveLog(context, req, now, null);
      }),
      catchError((err) => {
        this.saveLog(context, req, now, err).catch(() => {});
        return throwError(() => err);
      })
    );
  }

  private async saveLog(context: ExecutionContext, req: any, startTime: number, error: any) {
    try {
      const duration = Date.now() - startTime;
      const userAgent = (req.headers?.["user-agent"] as string) || "";
      const { browser, os } = parseUserAgent(userAgent);

      // 没有 @Log 装饰器的接口不记录日志
      const logMetadata = this.reflector.get<LogMetadata>(LOG_MODULE, context.getHandler());
      if (!logMetadata) return;

      const { module, actionType, title, content } = logMetadata;

      const log = new SysLog();
      log.module = module;
      log.actionType = actionType;
      log.title =
        title || `${LogModuleEnum.getLabel(module)}-${ActionTypeEnum.getLabel(actionType)}`;
      log.content = content || null;
      log.requestMethod = req.method;
      const url: string = req.originalUrl || req.url;
      log.requestUri = url;
      const xff = (req.headers?.["x-forwarded-for"] as string) || "";
      const realIp = xff.split(",")[0].trim();
      log.ip = realIp || req.ip || req.connection?.remoteAddress || null;
      log.province = null;
      log.city = null;
      log.device = os;
      log.os = os;
      log.browser = browser;
      log.status = error ? 0 : 1;
      log.errorMsg = error?.message || null;
      log.executionTime = duration;
      log.operatorId = req.user?.userId ?? null;
      log.operatorName = req.user?.username ?? null;
      log.createTime = new Date();

      await this.logRepository.save(log);
    } catch {
      // 日志保存失败不影响主流程
    }
  }

}
