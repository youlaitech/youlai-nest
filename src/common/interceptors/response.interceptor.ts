import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ErrorCode } from "../enums/error-code.enum";
import { Response } from "../interfaces/response.interface";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  constructor(private readonly reflector: Reflector) {}

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
        return {
          code: ErrorCode.SUCCESS.code,
          msg: ErrorCode.SUCCESS.msg,
          data,
          timestamp: Math.floor(Date.now() / 1000),
        };
      })
    );
  }
}
