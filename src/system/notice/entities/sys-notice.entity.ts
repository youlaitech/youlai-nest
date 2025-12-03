import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_notice")
export class SysNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, nullable: true, comment: "通知标题" })
  title: string;

  @Column({ type: "text", nullable: true, comment: "通知内容" })
  content: string;

  @Column({ type: "tinyint", comment: "通知类型（关联字典编码：notice_type）" })
  type: number;

  @Column({ length: 5, comment: "通知等级（字典code：notice_level）" })
  level: string;

  @Column({ name: "target_type", type: "tinyint", comment: "目标类型（1: 全体, 2: 指定）" })
  targetType: number;

  @Column({
    name: "target_user_ids",
    length: 255,
    nullable: true,
    comment: "目标人ID集合（多个使用英文逗号,分割）",
  })
  targetUserIds: string;

  @Column({ name: "publisher_id", nullable: true, comment: "发布人ID" })
  publisherId: number;

  @Column({
    name: "publish_status",
    type: "tinyint",
    default: 0,
    comment: "发布状态（0: 未发布, 1: 已发布, -1: 已撤回）",
  })
  publishStatus: number;

  @Column({ name: "publish_time", type: "datetime", nullable: true, comment: "发布时间" })
  publishTime: Date;

  @Column({ name: "revoke_time", type: "datetime", nullable: true, comment: "撤回时间" })
  revokeTime: Date;

  @Column({ name: "create_by", comment: "创建人ID" })
  createBy: number;

  @Column({ name: "create_time", type: "datetime", comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", nullable: true, comment: "更新人ID" })
  updateBy: number;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "是否删除（0: 未删除, 1: 已删除）",
  })
  isDeleted: number;
}
