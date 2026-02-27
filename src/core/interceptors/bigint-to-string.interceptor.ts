import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

@Injectable()
export class BigIntToStringInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(value: any): any {
    if (value === null || value === undefined) return value;

    // bigint 统一转字符串
    if (typeof value === "bigint") {
      return value.toString();
    }

    // 超出 JS 安全整数范围的 number 统一转字符串
    if (typeof value === "number") {
      return Math.abs(value) > MAX_SAFE ? value.toString() : value;
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.transform(v));
    }

    if (typeof value === "object") {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.transform(v);
      }
      return result;
    }

    return value;
  }
}
