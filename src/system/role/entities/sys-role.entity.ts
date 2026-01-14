import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_role")
export class SysRole {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

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

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人 ID" })
  createBy?: string | null;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "更新人ID" })
  updateBy?: string | null;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识(0-未删除 1-已删除)",
  })
  isDeleted: number;
}
