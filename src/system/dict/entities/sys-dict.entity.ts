import { Column, Entity } from "typeorm";
import { BaseEntity } from "@/common/entities/base.entity";

@Entity("sys_dict")
export class SysDict extends BaseEntity {
  @Column({ name: "dict_code", length: 50, nullable: true, comment: "类型编码" })
  dictCode: string;

  @Column({ length: 50, nullable: true, comment: "类型名称" })
  name: string;

  @Column({ type: "tinyint", default: 0, comment: "状态(0:正常;1:禁用)" })
  status: number;

  @Column({ length: 255, nullable: true, comment: "备注" })
  remark: string;
}
