import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { RequestContext } from "../context/request-context";

@Injectable()
/**
 * 数据范围上下文守卫
 *
 * 从 request.user 中提取用户的部门与数据范围信息，并写入 RequestContext。
 * 后续服务在构造查询条件时可以读取这些字段，实现按部门/本人等维度的数据过滤。
 */
export class DataScopeGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(reflector: Reflector) {
    this.reflector = reflector;
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Public 接口不需要上下文，避免残留
      RequestContext.setCurrentUser(null);
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user || request["user"];

    const userIdRaw = user?.userId;
    const deptIdRaw = user?.deptId;
    const roles = user?.roles ?? [];
    const perms = user?.perms ?? [];
    const userId =
      userIdRaw === undefined || userIdRaw === null || userIdRaw === ""
        ? undefined
        : String(userIdRaw);
    const deptId =
      deptIdRaw === undefined || deptIdRaw === null || deptIdRaw === "" ? null : String(deptIdRaw);
    const deptTreePath = user?.deptTreePath ?? null;
    const dataScope = user?.dataScope ?? null;

    if (!userId) {
      RequestContext.setCurrentUser(null);
      return true;
    }

    // 给后续查询阶段使用
    RequestContext.setCurrentUser({
      userId,
      deptId,
      deptTreePath,
      dataScope,
      roles,
      perms,
    });

    return true;
  }
}
