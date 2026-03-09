import { DataScopeEnum } from "../enums/data-scope.enum";

/** 角色数据权限 */
export class RoleDataScope {
  /** 角色编码 */
  roleCode: string;
  /** 数据范围：1-全部 2-自定义 3-本部门及子部门 4-本部门 5-仅本人 */
  dataScope: number;
  /** 自定义部门ID列表 */
  customDeptIds?: number[];

  constructor(roleCode: string, dataScope: number, customDeptIds?: number[]) {
    this.roleCode = roleCode;
    this.dataScope = dataScope;
    this.customDeptIds = customDeptIds;
  }

  /** 全部数据权限 */
  static all(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.ALL);
  }

  /** 本部门及子部门数据权限 */
  static deptAndSub(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.DEPT_AND_SUB);
  }

  /** 本部门数据权限 */
  static dept(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.DEPT);
  }

  /** 仅本人数据权限 */
  static self(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.SELF);
  }

  /** 自定义部门数据权限 */
  static custom(roleCode: string, deptIds: number[]): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.CUSTOM, deptIds);
  }

  toJSON(): { roleCode: string; dataScope: number; customDeptIds?: number[] } {
    return {
      roleCode: this.roleCode,
      dataScope: this.dataScope,
      customDeptIds: this.customDeptIds,
    };
  }

  static fromJSON(json: {
    roleCode: string;
    dataScope: number;
    customDeptIds?: number[];
  }): RoleDataScope {
    return new RoleDataScope(json.roleCode, json.dataScope, json.customDeptIds);
  }
}

/** 数据权限工具类 */
export class DataScopeUtils {
  static hasAllDataScope(dataScopes: RoleDataScope[]): boolean {
    return dataScopes.some((ds) => ds.dataScope === DataScopeEnum.ALL);
  }
}
