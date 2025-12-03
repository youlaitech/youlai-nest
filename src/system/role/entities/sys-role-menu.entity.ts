import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("sys_role_menu")
export class SysRoleMenu {
  @PrimaryColumn({ name: "role_id", comment: "角色ID" })
  roleId: number;

  @PrimaryColumn({ name: "menu_id", comment: "菜单ID" })
  menuId: number;
}
