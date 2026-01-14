import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_dict")
export class SysDict {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "dict_code", length: 50, nullable: true, comment: "类型编码" })
  dictCode: string;

  @Column({ length: 50, nullable: true, comment: "类型名称" })
  name: string;

  @Column({ type: "tinyint", default: 0, comment: "状态(0:正常;1:禁用)" })
  status: number;

  @Column({ length: 255, nullable: true, comment: "备注" })
  remark: string;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "是否删除(1-删除，0-未删除)",
  })
  isDeleted: number;
}
