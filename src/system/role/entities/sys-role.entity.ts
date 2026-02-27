import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities";

@Entity("sys_role")
export class SysRole extends BaseEntity {
  @Column({ length: 64, comment: "角色名称" })
  name: string;

  @Column({ length: 32, comment: "角色编码" })
  code: string;

  @Column({ nullable: true, comment: "显示顺序" })
  sort: number;

  @Column({ type: "tinyint", default: 1, comment: "角色状态(1-正常 0-停用)" })
  status: number;

  @Column({
    name: "data_scope",
    nullable: true,
    comment: "数据权限(1-所有数据 2-部门及子部门数据 3-本部门数据 4-本人数据)",
  })
  dataScope: number;
}
