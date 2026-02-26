import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 用户通知关联实体
 * 
 * 用户-通知关联表由系统自动生成，不需要记录创建人/修改人，
 * 因此不继承 BaseEntity，独立定义基础字段。
 */
@Entity("sys_user_notice")
export class SysUserNotice {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "notice_id", type: "bigint", comment: "公共通知id" })
  noticeId: string;

  @Column({ name: "user_id", type: "bigint", comment: "用户id" })
  userId: string;

  @Column({ name: "is_read", type: "tinyint", default: 0, comment: "读取状态（0: 未读, 1: 已读）" })
  isRead: number;

  @Column({ name: "read_time", type: "datetime", nullable: true, comment: "阅读时间" })
  readTime: Date;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @UpdateDateColumn({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除(0: 未删除, 1: 已删除)",
  })
  isDeleted: number;
}
