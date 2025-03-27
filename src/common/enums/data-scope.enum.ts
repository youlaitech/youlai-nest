/**
 * 数据权限范围枚举
 */
enum DataScopeEnum {
  /**
   * 所有数据
   */
  ALL = 1,

  /**
   * 本部门及子部门数据
   */
  DEPT_TREE = 2,

  /**
   * 本部门数据
   */
  CURRENT_DEPT = 3,

  /**
   * 本人数据
   */
  SELF = 4,
}
