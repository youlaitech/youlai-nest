import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROOT_ROLE_CODE } from "../../common/constants";
import { METADATA } from "../../common/constants/metadata.constant";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";

@Injectable()
/**
 * RBAC 权限守卫
 *
 * - Public 装饰器标记的接口直接放行
 * - Permissions 装饰器标记的接口，根据 request.user.perms 判断是否具备任一权限
 * - 角色包含 ROOT_ROLE_CODE 视为超级管理员，跳过权限校验
 */
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public 接口不做权限校验
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 读取控制器/方法上声明的权限标识
    const requiredPerms = this.reflector.getAllAndOverride<string[]>(METADATA.PERMISSIONS, [
      context.getHandler(),
      context.getClass(),
    ]);

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

    const perms: string[] = Array.isArray(user?.perms) ? user.perms : [];

    const hasPerm = requiredPerms.some((perm) => perms.includes(perm));
    if (!hasPerm) {
      throw new ForbiddenException("权限不足");
    }

    return true;
  }
}
