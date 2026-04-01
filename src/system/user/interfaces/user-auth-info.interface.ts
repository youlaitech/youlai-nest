import type { RoleDataScope } from "@/common/models/role-data-scope.model";

/**
 * 用户认证信息
 *
 * 用于登录认证阶段的用户信息承载，包含用户名、密码、状态、角色等与认证相关的数据。
 * 权限标识（perms）不在此接口中存储，而是在需要时从角色权限缓存中动态获取。
 */
export interface UserAuthInfo {
  /**
   * 用户ID
   */
  id: string;

  /**
   * 用户名
   */
  username: string;

  /**
   * 昵称
   */
  nickname?: string;

  /**
   * 密码（加密后）
   */
  password: string;

  /**
   * 状态（1:启用 其它:禁用）
   */
  status: number;

  /**
   * 部门ID
   */
  deptId: string;

  /**
   * 部门树路径
   */
  deptTreePath?: string;

  /**
   * 角色编码集合
   */
  roles: string[];

  /**
   * 数据权限列表
   *
   * 存储用户所有角色的数据权限范围，用于实现多角色权限合并（并集策略）
   */
  dataScopes: RoleDataScope[];
}
