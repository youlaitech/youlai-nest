import type { RoleDataScope } from "../models/role-data-scope.model";

/**
 * 当前登录用户信息
 * 存储于 JWT payload、Redis session 或 AsyncLocalStorage 上下文中
 */
export interface CurrentUserInfo {
  /** 用户ID */
  userId: string;
  /** 用户名 */
  username?: string;
  /** 所属部门ID */
  deptId: string;
  /** 部门树路径，用于数据权限过滤 */
  deptTreePath: string;
  /** 数据权限范围（按角色分组） */
  dataScopes: RoleDataScope[];
  /** 角色编码列表 */
  roles: string[];
  /** 权限标识列表 */
  perms?: string[];
  /** 是否为超级管理员 */
  isRoot?: boolean;
}
