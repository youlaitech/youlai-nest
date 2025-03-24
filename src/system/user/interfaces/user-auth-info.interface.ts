/**
 * 用户认证信息接口
 * 用于认证过程中获取用户的关键信息，例如登录时需要的用户名、密码、盐值以及权限等。
 */
export interface UserAuthInfo {
  /**
   * 用户ID
   */
  id: string;

  /**
   * 用户名，用于登录和唯一标识用户
   */
  username: string;

  /**
   * 密码
   */
  password: string;

  /**
   * 盐值，用于密码加密
   */
  salt: string;

  /**
   * 用户状态（1 正常，0 禁用）
   */
  status: number;

  /**
   * 角色列表，包含用户所属的所有角色标识，用于权限判断
   */
  roles: string[];

  /**
   * 部门树路径
   */
  deptTreePath: string;
}
