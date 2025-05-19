import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_dict_item")
export class SysDictItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: "dict_code",
    length: 50,
    nullable: true,
    comment: "关联字典编码，与sys_dict表中的dict_code对应",
  })
  dictCode: string;

  @Column({ length: 50, nullable: true, comment: "字典项值" })
  value: string;

  @Column({ length: 100, nullable: true, comment: "字典项标签" })
  label: string;

  @Column({
    name: "tag_type",
    length: 50,
    nullable: true,
    comment: "标签类型，用于前端样式展示（如success、warning等）",
  })
  tagType: string;

  @Column({ type: "tinyint", default: 0, comment: "状态（1-正常，0-禁用）" })
  status: number;

  @Column({ default: 0, comment: "排序" })
  sort: number;

  @Column({ length: 255, nullable: true, comment: "备注" })
  remark: string;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "create_by", nullable: true, comment: "创建人ID" })
  createBy: number;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "update_by", nullable: true, comment: "修改人ID" })
  updateBy: number;
}
