import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROOT_ROLE_CODE } from "../../common/constants";
import { METADATA } from "../../common/constants/metadata.constant";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { RolePermService } from "../../system/role/role-perm.service";

/**
 * RBAC 权限守卫
 *
 * 权限校验流程：
 * 1. Public 装饰器标记的接口直接放行
 * 2. 超级管理员（ROOT_ROLE_CODE）直接放行
 * 3. 未声明权限要求的接口放行
 * 4. 从角色权限缓存中获取用户权限，校验是否具备所需权限
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermService: RolePermService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public 接口不做权限校验
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 读取控制器/方法上声明的权限标识
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(
      METADATA.PERMISSIONS,
      [context.getHandler(), context.getClass()]
    );

    // 未声明权限则视为不需要鉴权
    if (!requiredPerms?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user || request["user"];

    // 超级管理员放行
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    if (roles.includes(ROOT_ROLE_CODE)) {
      return true;
    }

    // 从角色权限缓存获取用户权限
    const perms = await this.rolePermService.getPermsByRoleCodes(roles);

    // 校验是否具备任一所需权限
    const hasPerm = requiredPerms.some((perm) => perms.includes(perm));
    if (!hasPerm) {
      throw new ForbiddenException("权限不足");
    }

    return true;
  }
}
