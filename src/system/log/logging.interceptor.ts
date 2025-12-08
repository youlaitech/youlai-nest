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
      tap(async (data) => {
        try {
          const duration = Date.now() - now;
          const userAgent = (req.headers?.["user-agent"] as string) || "";

          const log = new SysLog();
          log.module = "SYSTEM";
          log.requestMethod = req.method;
          // 仅记录 query 和 params，避免把整个 body 写入日志
          log.requestParams = this.safeStringify({
            query: req.query,
            params: req.params,
          });
          log.responseContent = this.safeStringify(data);
          const url: string = req.originalUrl || req.url;
          log.content = `${req.method} ${url}`;
          log.requestUri = url;
          log.method = context.getHandler().name;
          const xff = (req.headers?.["x-forwarded-for"] as string) || "";
          const realIp = xff.split(",")[0].trim();
          log.ip = realIp || req.ip || req.connection?.remoteAddress || null;
          log.province = null;
          log.city = null;
          log.executionTime = duration;
          // 防止超出 sys_log.browser 的字段长度（varchar(100)）
          log.browser = userAgent ? userAgent.slice(0, 100) : null;
          log.browserVersion = null;
          log.os = null;
          log.createBy = req.user?.userId ?? null;
          log.createTime = new Date();
          log.isDeleted = 0;

          await this.logRepository.save(log);
        } catch (e) {
          // swallow logging errors to avoid影响主流程
        }
      })
    );
  }

  private safeStringify(payload: any): string | null {
    try {
      const str = JSON.stringify(payload);
      // 简单截断，避免超大响应占满日志表
      return str.length > 2000 ? str.slice(0, 2000) + "..." : str;
    } catch {
      return null;
    }
  }
}
