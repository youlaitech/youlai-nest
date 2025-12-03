import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";

/**
 * 占位拦截器，目前数据权限逻辑已由 TypeORM 全局插件处理。
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}
