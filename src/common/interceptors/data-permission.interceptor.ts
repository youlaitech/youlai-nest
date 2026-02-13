import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { RequestContext, DataPermissionConfig } from "../context/request-context";

export const DATA_PERMISSION_KEY = "data_permission";
export const SKIP_DATA_PERMISSION_KEY = "skip_data_permission";

/** 数据权限拦截器 */
@Injectable()
export class DataPermissionInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipDataPermission = this.reflector.getAllAndOverride<boolean>(SKIP_DATA_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipDataPermission) {
      RequestContext.setDataPermissionConfig(null);
      return next.handle();
    }

    const config = this.reflector.getAllAndOverride<DataPermissionConfig>(DATA_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    RequestContext.setDataPermissionConfig(config || null);

    return next.handle().pipe(
      tap(() => {
        RequestContext.setDataPermissionConfig(null);
      })
    );
  }
}

/** 跳过数据权限装饰器 */
export function SkipDataPermission(): MethodDecorator {
  return SetMetadata(SKIP_DATA_PERMISSION_KEY, true);
}
