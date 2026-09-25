import { Injectable, NestMiddleware } from "@nestjs/common";
import { RequestContext } from "../context/request-context";

/**
 * 请求上下文中间件
 * 初始化 AsyncLocalStorage 上下文，确保数据权限系统正常工作
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    RequestContext.run(() => {
      next();
    });
  }
}
