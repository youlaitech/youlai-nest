export interface JwtPayload {
  sub: string; // 用户ID
  username: string; // 用户名
  roles?: string[]; // 用户角色
  deptId?: string; // 部门ID
  dataScope?: number; // 数据范围
  deptTreePath?: string; // 部门树路径
}
