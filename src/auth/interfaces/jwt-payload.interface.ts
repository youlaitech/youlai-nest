import type { RoleDataScope } from "../../common/models/role-data-scope.model";

/**
 * JWT 载荷，access 与 refresh 共用，刷新令牌额外带 refreshToken 标记
 */
export interface JwtPayload {
  /** 用户ID */
  sub: string;
  /** 用户名 */
  username: string;
  /** 部门ID */
  deptId?: number;
  /** 数据权限列表 */
  dataScopes?: RoleDataScope[];
  /** 部门树路径 */
  deptTreePath?: string;
  /** 角色编码集合 */
  roles?: string[];
  /** 令牌版本，低于 Redis 中的当前版本即视为失效 */
  tokenVersion?: number;
  /** 令牌唯一标识，用于黑名单 */
  jti?: string;
  /** 标记为刷新令牌 */
  refreshToken?: boolean;
}
