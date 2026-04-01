import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@/common/entities/base.entity";

export enum SocialPlatform {
  WECHAT_MINI = "WECHAT_MINI",
  WECHAT_MP = "WECHAT_MP",
  ALIPAY = "ALIPAY",
  QQ = "QQ",
  APPLE = "APPLE",
}

@Entity("sys_user_social")
export class SysUserSocial extends BaseEntity {
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

  @Column({ length: 128, nullable: true, comment: "微信session_key" })
  sessionKey?: string;

  @Column({ type: "tinyint", default: 1, comment: "是否已验证(1-已验证 0-未验证)" })
  verified: number;
}
