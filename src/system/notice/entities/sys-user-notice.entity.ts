import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_user_notice")
export class SysUserNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "notice_id", comment: "公共通知id" })
  noticeId: number;

  @Column({ name: "user_id", comment: "用户id" })
  userId: number;

  @Column({ name: "is_read", type: "tinyint", default: 0, comment: "读取状态（0: 未读, 1: 已读）" })
  isRead: number;

  @Column({ name: "read_time", type: "datetime", nullable: true, comment: "阅读时间" })
  readTime: Date;

  @Column({ name: "create_time", type: "datetime", comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除(0: 未删除, 1: 已删除)",
  })
  isDeleted: number;
}
