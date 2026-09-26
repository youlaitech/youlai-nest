import type { RoleDataScope } from "../../common/models/role-data-scope.model";

/**
 * 用户会话信息（Redis-Token 模式下的会话快照）。
 */
export interface UserSession {
  /** 用户ID */
  userId: number;

  /** 用户名 */
  username: string;

  /** 部门ID */
  deptId?: number;

  /** 数据权限列表（支持多角色） */
  dataScopes: RoleDataScope[];

  /** 角色权限集合 */
  roles: string[];
}
