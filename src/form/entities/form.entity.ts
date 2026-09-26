import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * 表单定义实体（form_definition）。
 */
@Entity("form_definition")
export class FormDefinition {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "form_key", length: 64, comment: "表单唯一标识" })
  formKey: string;

  @Column({ name: "form_name", length: 100, comment: "表单名称" })
  formName: string;

  @Column({ length: 255, nullable: true, comment: "表单描述" })
  description: string | null;

  @Column({ name: "form_json", type: "json", nullable: true, comment: "表单规则" })
  formJson: any[] | null;

  @Column({ name: "options_json", type: "json", nullable: true, comment: "表单全局配置" })
  optionsJson: Record<string, any> | null;

  @Column({ type: "tinyint", default: 0, comment: "状态(0草稿 1已发布 -1已停用)" })
  status: number;

  @Column({ name: "is_public", type: "tinyint", default: 0, comment: "是否允许匿名公开访问" })
  isPublic: number;

  @Column({ length: 16, default: "normal", comment: "normal通用表单 workflow审批表单" })
  category: string;

  @Column({ name: "menu_id", type: "bigint", nullable: true, comment: "生成的访问菜单ID" })
  menuId: string | null;

  @Column({ type: "int", default: 1, comment: "版本号" })
  version: number;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "创建人ID" })
  createBy?: string | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @UpdateDateColumn({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "is_deleted", type: "tinyint", default: 0, comment: "是否删除" })
  isDeleted: number;
}

/**
 * 表单数据实体（form_data）。
 */
@Entity("form_data")
export class FormData {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "form_id", type: "bigint", comment: "表单定义ID" })
  formId: string;

  @Column({ name: "form_version", type: "int", comment: "提交时表单版本" })
  formVersion: number;

  @Column({ name: "data_json", type: "json", nullable: true, comment: "表单数据" })
  dataJson: Record<string, any> | null;

  @Column({ name: "create_by", type: "bigint", nullable: true, comment: "提交人ID，匿名为空" })
  createBy?: string | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "提交时间" })
  createTime: Date;

  @Column({ name: "update_by", type: "bigint", nullable: true, comment: "修改人ID" })
  updateBy?: string | null;

  @UpdateDateColumn({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "is_deleted", type: "tinyint", default: 0, comment: "是否删除" })
  isDeleted: number;
}

/**
 * 表单版本快照实体（form_snapshot）：发布时固化规则，只增不改。
 */
@Entity("form_snapshot")
export class FormSnapshot {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "form_id", type: "bigint", comment: "表单定义ID" })
  formId: string;

  @Column({ type: "int", comment: "版本号" })
  version: number;

  @Column({ name: "form_json", type: "json", nullable: true, comment: "表单规则快照" })
  formJson: any[] | null;

  @Column({ name: "options_json", type: "json", nullable: true, comment: "表单全局配置快照" })
  optionsJson: Record<string, any> | null;

  @CreateDateColumn({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @UpdateDateColumn({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ name: "is_deleted", type: "tinyint", default: 0, comment: "是否删除" })
  isDeleted: number;
}
