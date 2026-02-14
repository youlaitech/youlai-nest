import { Entity, PrimaryColumn } from "typeorm";

/**
 * 角色部门关联实体
 *
 * 用于自定义数据权限，存储角色可访问的部门ID列表
 */
@Entity("sys_role_dept")
export class SysRoleDept {
  /**
   * 角色ID
   */
  @PrimaryColumn({ name: "role_id", type: "bigint", comment: "角色ID" })
  roleId: string;

  /**
   * 部门ID
   */
  @PrimaryColumn({ name: "dept_id", type: "bigint", comment: "部门ID" })
  deptId: string;
}
