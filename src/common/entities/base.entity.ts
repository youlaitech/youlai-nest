import {
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

/**
 * 实体基类
 * 封装通用字段，所有业务实体继承此类
 * 包含：id、创建/更新时间、创建/更新人、逻辑删除标识
 * 
 * 注意：createTime 和 updateTime 字段由 AuditSubscriber 自动填充，
 * 不使用 @CreateDateColumn/@UpdateDateColumn 装饰器，避免冲突
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识(0-未删除 1-已删除)",
  })
  isDeleted: number;
}
