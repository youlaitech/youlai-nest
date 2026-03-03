/**
 * 数据权限范围枚举
 * 多角色数据权限合并策略：取并集（OR），即用户能看到所有角色权限范围内的数据。
 * 如果任一角色是 ALL，则直接跳过数据权限过滤。
 */
export enum DataScopeEnum {
  /**
   * 所有数据权限 - 最高权限，可查看所有数据
   */
  ALL = 1,

  /**
   * 部门及子部门数据 - 可查看本部门及其下属所有部门的数据
   */
  DEPT_AND_SUB = 2,

  /**
   * 本部门数据 - 仅可查看本部门的数据
   */
  DEPT = 3,

  /**
   * 本人数据 - 仅可查看自己的数据
   */
  SELF = 4,

  /**
   * 自定义部门数据 - 可查看指定部门的数据
   * 需要配合 sys_role_dept 表使用，存储角色可访问的部门ID列表
   */
  CUSTOM = 5,
}

/**
 * 获取数据权限枚举值
 */
export function getDataScopeByValue(value: number): DataScopeEnum | undefined {
  return Object.values(DataScopeEnum).find((v) => v === value) as DataScopeEnum | undefined;
}

/**
 * 判断是否为全部数据权限
 */
export function isAllDataScope(value: number): boolean {
  return value === DataScopeEnum.ALL;
}
