import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    // 根据请求路径或其他条件判断是否应用拦截器逻辑
    const excludeInterceptor = request.url.includes('/wechat-push/token'); // 举例：如果请求路径包含 '/exclude'，则不应用拦截器

    if (excludeInterceptor) {
      // 如果条件满足，则直接返回原始数据
      return next.handle();
    }
    const createBy = this.reflector.get<boolean>(
      'createBy',
      context.getHandler(),
    );
    if (createBy) {
      const userId = request['user']?.userId;
      const deptTreePath = request['user']?.deptTreePath || '0';
      request.body.createBy = userId;
      request.body.deptTreePath = deptTreePath;
      request.body.createTime = Math.floor(Date.now() / 1000);
    }
    const updateBy = this.reflector.get<boolean>(
      'updateBy',
      context.getHandler(),
    );
    if (updateBy) {
      request.body.updateBy = request['user']?.userId;
      request.body.updateTime = Math.floor(Date.now() / 1000);
    }

    return next
      .handle()
      .pipe(map((data) => ({ data, code: '00000', msg: 'Success' })));
  }
}
