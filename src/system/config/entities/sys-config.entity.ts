import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../common/entities";

@Entity("sys_config")
export class SysConfig extends BaseEntity {
  @Column({ name: "config_name", length: 50, comment: "配置名称" })
  configName: string;

  @Column({ name: "config_key", length: 50, comment: "配置键" })
  configKey: string;

  @Column({ name: "config_value", length: 500, comment: "配置值" })
  configValue: string;

  @Column({ length: 500, nullable: true, comment: "备注" })
  remark: string;
}
