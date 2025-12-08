import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_config")
export class SysConfig {
  @PrimaryGeneratedColumn({ comment: "主键" })
  id: number;

  @Column({ name: "config_name", length: 50, comment: "配置名称" })
  configName: string;

  @Column({ name: "config_key", length: 50, comment: "配置键" })
  configKey: string;

  @Column({ name: "config_value", length: 500, comment: "配置值" })
  configValue: string;

  @Column({ length: 500, nullable: true, comment: "备注" })
  remark: string;

  @Column({ name: "create_by", nullable: true, comment: "创建人ID" })
  createBy: number;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", nullable: true, comment: "更新人ID" })
  updateBy: number;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识（0: 未删除, 1: 已删除）",
  })
  isDeleted: number;
}
