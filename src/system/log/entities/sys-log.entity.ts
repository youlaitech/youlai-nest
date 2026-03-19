import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

/**
 * 系统日志实体
 */
@Entity("sys_log")
export class SysLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "action_type", type: "varchar", length: 50, comment: "行为类型" })
  actionType: string;

  @Column({
    name: "request_uri",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "请求路径",
  })
  requestUri: string | null;

  @Column({
    name: "request_method",
    type: "varchar",
    length: 10,
    nullable: true,
    comment: "请求方式",
  })
  requestMethod: string | null;

  @Column({ type: "varchar", length: 45, nullable: true, comment: "IP地址" })
  ip: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "省份" })
  province: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "城市" })
  city: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "设备" })
  device: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "操作系统" })
  os: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "浏览器" })
  browser: string | null;

  @Column({ type: "tinyint", nullable: true, comment: "状态：0失败 1成功" })
  status: number | null;

  @Column({ name: "error_msg", type: "varchar", length: 255, nullable: true, comment: "错误信息" })
  errorMsg: string | null;

  @Column({ name: "execution_time", type: "int", nullable: true, comment: "执行时间(ms)" })
  executionTime: number | null;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "操作用户ID" })
  createBy?: string | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;
}
