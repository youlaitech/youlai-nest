import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_dict_item")
export class SysDictItem {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ name: "create_by", nullable: true, comment: "创建人ID" })
  createBy: number;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", nullable: true, comment: "修改人ID" })
  updateBy: number;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;
}
