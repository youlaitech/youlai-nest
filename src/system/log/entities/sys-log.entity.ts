import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from "typeorm";

/**
 * 系统日志实体
 * 日志只需记录创建信息，不需要更新和逻辑删除
 */
@Entity("sys_log")
export class SysLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;
  @Column({ type: "varchar", length: 50, comment: "日志模块" })
  module: string;

  @Column({ name: "request_method", type: "varchar", length: 64, comment: "请求方式" })
  requestMethod: string;

  @Column({ name: "request_params", type: "text", nullable: true, comment: "请求参数" })
  requestParams: string | null;

  @Column({ name: "response_content", type: "mediumtext", nullable: true, comment: "返回参数" })
  responseContent: string | null;

  @Column({ type: "varchar", length: 255, comment: "日志内容" })
  content: string;

  @Column({
    name: "request_uri",
    type: "varchar",
    length: 255,
    nullable: true,
    comment: "请求路径",
  })
  requestUri: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, comment: "方法名" })
  method: string | null;

  @Column({ type: "varchar", length: 45, nullable: true, comment: "IP地址" })
  ip: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "省份" })
  province: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "城市" })
  city: string | null;

  @Column({ name: "execution_time", type: "bigint", nullable: true, comment: "执行时间(ms)" })
  executionTime: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "浏览器" })
  browser: string | null;

  @Column({
    name: "browser_version",
    type: "varchar",
    length: 100,
    nullable: true,
    comment: "浏览器版本",
  })
  browserVersion: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, comment: "终端系统" })
  os: string | null;
}
