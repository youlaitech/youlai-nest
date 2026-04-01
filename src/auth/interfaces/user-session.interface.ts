import type { RoleDataScope } from "../../common/models/role-data-scope.model";

/**
 * 用户会话信息
 * 存储在Token中的用户会话快照，包含用户身份、数据权限和角色权限信息。
 * 用于Redis-Token模式下的会话管理，支持在线用户查询和会话控制。
 */
export interface UserSession {
  /**
   * 用户ID
   */
  userId: number;

  /**
   * 用户名
   */
  username: string;

  /**
   * 部门ID
   */
  deptId?: number;

  /**
   * 数据权限列表（支持多角色）
   */
  dataScopes: RoleDataScope[];

  /**
   * 角色权限集合
   */
  roles: string[];
}

/**
 * 在线用户信息DTO
 * 用于返回在线用户的基本信息，包括用户名、会话数量和登录时间。
 */
export interface OnlineUserDto {
  /**
   * 用户名
   */
  username: string;

  /**
   * 会话数量（多设备登录时大于1）
   */
  sessionCount: number;

  /**
   * 最早登录时间
   */
  loginTime: number;
}
