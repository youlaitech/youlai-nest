import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { RequestContext } from "../context/request-context";
import { RoleDataScope } from "../../common/models/role-data-scope.model";

/**
 * 数据范围守卫
 * 从 request.user 提取用户信息和数据权限列表，写入 RequestContext
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(reflector: Reflector) {
    this.reflector = reflector;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 公开接口不设置上下文
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      RequestContext.setCurrentUser(null);
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user || request["user"];

    // 未登录用户
    const userId = this.parseUserId(user?.userId);
    if (!userId) {
      RequestContext.setCurrentUser(null);
      return true;
    }

    // 解析用户上下文信息
    const deptId = this.parseId(user?.deptId);
    const deptTreePath = user?.deptTreePath ?? null;
    const roles = user?.roles ?? [];
    const perms = user?.perms ?? [];
    const isRoot = roles.includes("ROOT");

    // 多角色数据权限列表
    const dataScopes = this.parseDataScopes(user?.dataScopes);

    RequestContext.initUserContext({
      userId,
      deptId,
      deptTreePath,
      dataScopes,
      roles,
      perms,
      isRoot,
    });

    return true;
  }

  /** 解析用户ID */
  private parseUserId(value: any): string | undefined {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return String(value);
  }

  /** 解析部门ID */
  private parseId(value: any): string | null {
    if (value === undefined || value === null || value === "") {
      return null;
    }
    return String(value);
  }

  /** 解析多角色数据权限 */
  private parseDataScopes(dataScopes: any): RoleDataScope[] {
    if (!dataScopes || !Array.isArray(dataScopes)) {
      return [];
    }
    return dataScopes.map((ds: any) => RoleDataScope.fromJSON(ds));
  }
}
