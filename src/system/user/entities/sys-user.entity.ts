import {
  Column,
  Entity,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { SysRole } from "../../role/entities/sys-role.entity";
import { BaseEntity } from "../../../common/entities";

@Entity("sys_user")
export class SysUser extends BaseEntity {
  @Column({ length: 64, comment: "用户名" })
  username: string;

  @Column({ length: 64, comment: "昵称" })
  nickname: string;

  @Column({ type: "tinyint", default: 1, comment: "性别((1-男 2-女 0-保密)" })
  gender: number;

  @Column({ length: 100, comment: "密码" })
  password: string;

  @Column({ name: "dept_id", type: "bigint", nullable: true, comment: "部门ID" })
  deptId?: string | null;

  @Column({ length: 255, nullable: true, comment: "用户头像" })
  avatar: string;

  @Column({ length: 20, nullable: true, comment: "联系方式" })
  mobile: string;

  @Column({ type: "tinyint", default: 1, comment: "状态(1-正常 0-禁用)" })
  status: number;

  @Column({ length: 128, nullable: true, comment: "用户邮箱" })
  email: string;

  @ManyToMany(() => SysRole)
  @JoinTable({
    name: "sys_user_role",
    joinColumn: { name: "user_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "role_id", referencedColumnName: "id" },
  })
  roles: SysRole[];
}
