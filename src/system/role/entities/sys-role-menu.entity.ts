import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from "typeorm";
import { SysRole } from "./sys-role.entity";
import { SysMenu } from "../../menu/entities/sys-menu.entity";

@Entity("sys_role_menu")
export class SysRoleMenu {
  @PrimaryColumn({ name: "role_id", type: "bigint", comment: "角色ID" })
  roleId: string;

  @PrimaryColumn({ name: "menu_id", type: "bigint", comment: "菜单ID" })
  menuId: string;

  @ManyToOne(() => SysRole)
  @JoinColumn({ name: "role_id", referencedColumnName: "id" })
  role: SysRole;

  @ManyToOne(() => SysMenu)
  @JoinColumn({ name: "menu_id", referencedColumnName: "id" })
  menu: SysMenu;
}
