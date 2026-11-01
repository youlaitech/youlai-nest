import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

/** 微信小程序的认证源标识，与配置保持一致 */
export const WECHAT_MINI_PROVIDER = "wechat-mini-main";

/**
 * 本地用户与外部账号的关联实体（sys_user_identity）
 *
 * 该表不含审计人列与逻辑删除列，故按表结构显式声明列而不继承 BaseEntity
 */
@Entity("sys_user_identity")
export class SysUserIdentity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint", comment: "本地用户ID" })
  userId: string;

  @Column({ length: 64, comment: "具体认证源标识，如 wechat-mini-main" })
  provider: string;

  @Column({ name: "provider_account_id", length: 255, comment: "来源方账号ID" })
  providerAccountId: string;

  @Column({ name: "display_name", length: 128, nullable: true, comment: "外部账号展示名" })
  displayName?: string;

  @Column({ name: "avatar_url", length: 512, nullable: true, comment: "外部账号头像" })
  avatarUrl?: string;

  @Column({ name: "last_login_time", type: "datetime", nullable: true, comment: "最近一次登录时间" })
  lastLoginTime?: Date;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "关联创建时间" })
  createTime: Date;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;
}
