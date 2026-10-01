import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum SocialPlatform {
  WECHAT_MINI = "WECHAT_MINI",
  WECHAT_MP = "WECHAT_MP",
  ALIPAY = "ALIPAY",
  QQ = "QQ",
  APPLE = "APPLE",
}

/**
 * 第三方账号绑定实体（sys_user_social）
 *
 * 该表不含审计人列与逻辑删除列，故按表结构显式声明列而不继承 BaseEntity；
 * session_key 需显式映射，避免 SQL 使用表里不存在的 sessionKey。
 */
@Entity("sys_user_social")
export class SysUserSocial {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint", comment: "用户ID" })
  userId: string;

  @Column({
    type: "enum",
    enum: SocialPlatform,
    comment: "平台类型",
  })
  platform: SocialPlatform;

  @Column({ length: 64, comment: "平台openid" })
  openid: string;

  @Column({ length: 64, nullable: true, comment: "微信unionid" })
  unionid?: string;

  @Column({ length: 64, nullable: true, comment: "第三方昵称" })
  nickname?: string;

  @Column({ length: 255, nullable: true, comment: "第三方头像URL" })
  avatar?: string;

  @Column({ name: "session_key", length: 128, nullable: true, comment: "微信session_key" })
  sessionKey?: string;

  @Column({ type: "tinyint", default: 1, comment: "是否已验证(1-已验证 0-未验证)" })
  verified: number;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;
}
