import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_dept")
export class SysDept {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ length: 100, comment: "部门名称" })
  name: string;

  @Column({ length: 100, comment: "部门编号" })
  code: string;

  @Column({ name: "parent_id", type: "bigint", default: "0", comment: "父节点id" })
  parentId: string;

  @Column({ name: "tree_path", length: 255, comment: "父节点id路径" })
  treePath: string;

  @Column({ type: "smallint", default: 0, comment: "显示顺序" })
  sort: number;

  @Column({ type: "tinyint", default: 1, comment: "状态(1-正常 0-禁用)" })
  status: number;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime?: Date | null;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime?: Date | null;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识(1-已删除 0-未删除)",
  })
  isDeleted: number;
}
