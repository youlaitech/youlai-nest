import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map } from "rxjs";

@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // 自动注入查询条件
        if (data instanceof Array) {
          return data.map((item) => ({ ...item, $match: request.dataFilter }));
        }
        return { ...data, $match: request.dataFilter };
      })
    );
  }
}
