import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 字典项实体
 * 
 * 字典项属于系统元数据，删除通常是物理删除，不需要逻辑删除标识，
 * 因此不继承 BaseEntity，独立定义基础字段。
 */
@Entity("sys_dict_item")
export class SysDictItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "dict_code", length: 64, comment: "字典编码" })
  dictCode: string;

  @Column({ length: 50, comment: "字典项名称" })
  label: string;

  @Column({ length: 50, comment: "字典项值" })
  value: string;

  @Column({ type: "smallint", default: 0, comment: "排序" })
  sort: number;

  @Column({ type: "tinyint", default: 1, comment: "状态(1-正常 0-停用)" })
  status: number;

  @Column({ name: "tag_type", length: 50, nullable: true, comment: "标签类型" })
  tagType: string;

  @Column({ length: 255, nullable: true, comment: "备注" })
  remark: string;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @UpdateDateColumn({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;
}
