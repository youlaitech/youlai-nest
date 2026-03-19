import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysLog } from "./entities/sys-log.entity";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(SysLog)
    private readonly logRepository: Repository<SysLog>
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const now = Date.now();
    const http = context.switchToHttp();
    const req: any = http.getRequest();

    return next.handle().pipe(
      tap(async (_data) => {
        try {
          const duration = Date.now() - now;
          const userAgent = (req.headers?.["user-agent"] as string) || "";

          const log = new SysLog();
          log.actionType = "API";
          log.requestMethod = req.method;
          const url: string = req.originalUrl || req.url;
          log.requestUri = url;
          const xff = (req.headers?.["x-forwarded-for"] as string) || "";
          const realIp = xff.split(",")[0].trim();
          log.ip = realIp || req.ip || req.connection?.remoteAddress || null;
          log.province = null;
          log.city = null;
          log.device = null;
          log.os = null;
          log.browser = userAgent ? userAgent.slice(0, 100) : null;
          log.status = 1;
          log.errorMsg = null;
          log.executionTime = duration;
          log.createBy = req.user?.userId ?? null;
          log.createTime = new Date();

          await this.logRepository.save(log);
        } catch (_e) {
          // 日志保存失败不影响主流程
        }
      })
    );
  }
}
