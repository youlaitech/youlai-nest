import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ErrorCode } from "../enums/error-code.enum";
import { Response } from "../interfaces/response.interface";
import { transformDatesInObject, DateFormatOptions } from "../utils/serialize.util";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly dateFormatOptions: DateFormatOptions;
  constructor(
    private readonly reflector: Reflector,
    configService?: ConfigService
  ) {
    this.dateFormatOptions = {
      format: configService?.get<string>("DATE_FORMAT") || "yyyy-MM-dd HH:mm:ss",
      timeZone: configService?.get<string>("TIME_ZONE") || "Asia/Shanghai",
    };
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const skip = this.reflector.getAllAndOverride<boolean>("skipResponseTransform", [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) {
      return next.handle() as any;
    }

    return next.handle().pipe(
      map((data) => {
        // 分页接口：业务层统一返回 { data, page }
        if (
          data &&
          typeof data === "object" &&
          Object.prototype.hasOwnProperty.call(data as any, "data") &&
          Object.prototype.hasOwnProperty.call(data as any, "page")
        ) {
          const formattedData = transformDatesInObject((data as any).data, this.dateFormatOptions);
          const formattedPage = transformDatesInObject(
            (data as any).page ?? undefined,
            this.dateFormatOptions
          );
          return {
            code: ErrorCode.SUCCESS.code,
            msg: ErrorCode.SUCCESS.msg,
            data: formattedData,
            page: formattedPage,
          };
        }

        const formatted = transformDatesInObject(data, this.dateFormatOptions);
        return {
          code: ErrorCode.SUCCESS.code,
          msg: ErrorCode.SUCCESS.msg,
          data: formatted,
        };
      })
    );
  }
}
