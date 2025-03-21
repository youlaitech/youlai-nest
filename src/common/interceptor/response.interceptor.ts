import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ResponseCode } from "../enums/response-code.enum";
import { Response } from "../types/response.type";

/**
 * 响应标准化拦截器
 *
 * 注意：此拦截器仅处理成功响应（HTTP状态码 2xx），
 * 控制器或服务中抛出的 HttpException 等异常会由全局异常过滤器处理，
 * 不会进入本拦截器的 map 处理流程
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly EXCLUDED_PATHS = ["/wechat-push/token"];

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();

    if (this.EXCLUDED_PATHS.some((path) => request.url.includes(path))) {
      return next.handle();
    }
    /**
     * 请求体自动填充
     * 仅在非排除路径下触发，根据路由元数据自动添加：
     * - createBy/createTime 创建信息（POST请求）
     * - updateBy/updateTime 更新信息（PUT/PATCH请求）
     */
    this.autoFillRequestData(context, request);

    /**
     * 响应处理管道
     *
     * 注意：此处的 map 操作符仅处理成功响应流程，当出现以下情况时：
     * 1. 控制器抛出异常（throw new HttpException）
     * 2. 服务层发生未捕获错误
     * 会直接跳过本拦截器，由全局异常过滤器处理
     *
     * 成功响应标准化格式：
     * {
     *   code: 200,                // 业务状态码
     *   msg: "success",           // 响应消息
     *   data: T,                  // 实际业务数据
     *   timestamp: 1710000000     // 响应时间戳（秒级）
     * }
     */
    return next.handle().pipe(
      map((data) => {
        return {
          code: ResponseCode.SUCCESS.code,
          msg: ResponseCode.SUCCESS.msg,
          data,
          timestamp: Math.floor(Date.now() / 1000),
        };
      })
    );
  }

  /**
   * 请求体自动填充
   * @param context 上下文对象
   * @param request 请求对象
   */
  private autoFillRequestData(context: ExecutionContext, request: Request) {
    const handler = context.getHandler();
    const user = request["user"] || {};

    if (this.reflector.get<boolean>("createBy", handler)) {
      const updatedBody = {
        ...request.body,
        createBy: user.userId,
        deptTreePath: user.deptTreePath || "0",
        createTime: Math.floor(Date.now() / 1000),
      };
      Object.defineProperty(request, "body", { value: updatedBody, writable: false });
    }

    const updatedBody = {
      ...request.body,
      updateBy: user.userId,
      updateTime: Math.floor(Date.now() / 1000),
    };
    Object.defineProperty(request, "body", { value: updatedBody, writable: false });
  }
}
