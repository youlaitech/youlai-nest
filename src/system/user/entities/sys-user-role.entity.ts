import { Entity, PrimaryColumn } from "typeorm";

@Entity("sys_user_role")
export class SysUserRole {
  @PrimaryColumn({ name: "user_id", type: "bigint", comment: "用户ID" })
  userId: string;

  @PrimaryColumn({ name: "role_id", type: "bigint", comment: "角色ID" })
  roleId: string;
}
