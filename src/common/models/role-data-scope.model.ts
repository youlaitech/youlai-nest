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

  static all(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.ALL);
  }

  static deptAndSub(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.DEPT_AND_SUB);
  }

  static dept(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.DEPT);
  }

  static self(roleCode: string): RoleDataScope {
    return new RoleDataScope(roleCode, DataScopeEnum.SELF);
  }

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

  static fromJSON(json: { roleCode: string; dataScope: number; customDeptIds?: number[] }): RoleDataScope {
    return new RoleDataScope(json.roleCode, json.dataScope, json.customDeptIds);
  }
}

/** 数据权限工具类 */
export class DataScopeUtils {
  static hasAllDataScope(dataScopes: RoleDataScope[]): boolean {
    return dataScopes.some((ds) => ds.dataScope === DataScopeEnum.ALL);
  }

  static getMaxDataScope(dataScopes: RoleDataScope[]): number {
    if (!dataScopes || dataScopes.length === 0) {
      return DataScopeEnum.SELF;
    }
    return Math.min(...dataScopes.map((ds) => ds.dataScope));
  }

  static mergeDataScopes(dataScopes: RoleDataScope[]): RoleDataScope[] {
    const map = new Map<string, RoleDataScope>();
    for (const ds of dataScopes) {
      const existing = map.get(ds.roleCode);
      if (!existing || ds.dataScope < existing.dataScope) {
        map.set(ds.roleCode, ds);
      }
    }
    return Array.from(map.values());
  }
}
