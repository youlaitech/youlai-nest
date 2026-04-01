import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import { RequestContext, DataPermissionConfig } from "../context/request-context";
import {
  DATA_PERMISSION_KEY,
  SKIP_DATA_PERMISSION_KEY,
} from "../../common/decorators/data-permission.decorator";

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

    return next.handle().pipe(finalize(() => RequestContext.setDataPermissionConfig(null)));
  }
}
