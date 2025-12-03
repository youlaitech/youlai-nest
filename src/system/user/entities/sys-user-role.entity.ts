import { Entity, PrimaryColumn } from "typeorm";

@Entity("sys_user_role")
export class SysUserRole {
  @PrimaryColumn({ name: "user_id", comment: "用户ID" })
  userId: number;

  @PrimaryColumn({ name: "role_id", comment: "角色ID" })
  roleId: number;
}
