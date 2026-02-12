/**
 * 角色数据权限信息
 * 用于存储单个角色的数据权限范围信息，支持多角色数据权限合并（并集策略）
 */
export interface RoleDataScope {
  /**
   * 角色编码
   */
  roleCode: string;

  /**
   * 数据权限范围值
   * 1-所有数据 2-部门及子部门 3-本部门 4-本人 5-自定义部门
   */
  dataScope: number;

  /**
   * 自定义部门ID列表（仅当 dataScope=5 时有效）
   */
  customDeptIds?: number[];
}

/**
 * 角色数据权限工厂方法
 */
export class RoleDataScopeFactory {
  /**
   * 创建"全部数据"权限
   */
  static all(roleCode: string): RoleDataScope {
    return { roleCode, dataScope: 1, customDeptIds: undefined };
  }

  /**
   * 创建"部门及子部门"权限
   */
  static deptAndSub(roleCode: string): RoleDataScope {
    return { roleCode, dataScope: 2, customDeptIds: undefined };
  }

  /**
   * 创建"本部门"权限
   */
  static dept(roleCode: string): RoleDataScope {
    return { roleCode, dataScope: 3, customDeptIds: undefined };
  }

  /**
   * 创建"本人"权限
   */
  static self(roleCode: string): RoleDataScope {
    return { roleCode, dataScope: 4, customDeptIds: undefined };
  }

  /**
   * 创建"自定义部门"权限
   */
  static custom(roleCode: string, deptIds: number[]): RoleDataScope {
    return { roleCode, dataScope: 5, customDeptIds: deptIds };
  }
}

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
