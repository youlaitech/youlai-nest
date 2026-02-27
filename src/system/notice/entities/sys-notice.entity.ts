import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities";

@Entity("sys_notice")
export class SysNotice extends BaseEntity {
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

  @Column({ name: "publisher_id", type: "bigint", nullable: true, comment: "发布人ID" })
  publisherId?: string | null;

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
}
