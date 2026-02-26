import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities";

@Entity("sys_dept")
export class SysDept extends BaseEntity {
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
}
