import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ErrorCode } from "../enums/error-code.enum";
import { Response } from "../interfaces/response.interface";

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
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
