import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_user")
export class SysUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 64, comment: "用户名" })
  username: string;

  @Column({ length: 64, comment: "昵称" })
  nickname: string;

  @Column({ type: "tinyint", default: 1, comment: "性别((1-男 2-女 0-保密)" })
  gender: number;

  @Column({ length: 100, comment: "密码" })
  password: string;

  @Column({ name: "dept_id", nullable: true, comment: "部门ID" })
  deptId: number;

  @Column({ length: 255, nullable: true, comment: "用户头像" })
  avatar: string;

  @Column({ length: 20, nullable: true, comment: "联系方式" })
  mobile: string;

  @Column({ type: "tinyint", default: 1, comment: "状态(1-正常 0-禁用)" })
  status: number;

  @Column({ length: 128, nullable: true, comment: "用户邮箱" })
  email: string;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "create_by", nullable: true, comment: "创建人ID" })
  createBy: number;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "update_by", nullable: true, comment: "修改人ID" })
  updateBy: number;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识(0-未删除 1-已删除)",
  })
  isDeleted: number;

  @Column({ length: 28, nullable: true, comment: "微信 openid" })
  openid: string;
}
