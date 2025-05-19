import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("sys_menu")
export class SysMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "parent_id", comment: "父菜单ID" })
  parentId: number;

  @Column({ name: "tree_path", length: 255, nullable: true, comment: "父节点ID路径" })
  treePath: string;

  @Column({ length: 64, comment: "菜单名称" })
  name: string;

  @Column({ comment: "菜单类型（1-菜单 2-目录 3-外链 4-按钮）" })
  type: number;

  @Column({
    name: "route_name",
    length: 255,
    nullable: true,
    comment: "路由名称（Vue Router 中用于命名路由）",
  })
  routeName: string;

  @Column({
    name: "route_path",
    length: 128,
    nullable: true,
    comment: "路由路径（Vue Router 中定义的 URL 路径）",
  })
  routePath: string;

  @Column({
    length: 128,
    nullable: true,
    comment: "组件路径（组件页面完整路径，相对于 src/views/，缺省后缀 .vue）",
  })
  component: string;

  @Column({ length: 128, nullable: true, comment: "【按钮】权限标识" })
  perm: string;

  @Column({
    name: "always_show",
    type: "tinyint",
    default: 0,
    nullable: true,
    comment: "【目录】只有一个子路由是否始终显示（1-是 0-否）",
  })
  alwaysShow: number;

  @Column({
    name: "keep_alive",
    type: "tinyint",
    default: 0,
    nullable: true,
    comment: "【菜单】是否开启页面缓存（1-是 0-否）",
  })
  keepAlive: number;

  @Column({ type: "tinyint", default: 1, comment: "显示状态（1-显示 0-隐藏）" })
  visible: number;

  @Column({ default: 0, comment: "排序" })
  sort: number;

  @Column({ length: 64, nullable: true, comment: "菜单图标" })
  icon: string;

  @Column({ length: 128, nullable: true, comment: "跳转路径" })
  redirect: string;

  @Column({ name: "create_time", type: "datetime", nullable: true, comment: "创建时间" })
  createTime: Date;

  @Column({ name: "update_time", type: "datetime", nullable: true, comment: "更新时间" })
  updateTime: Date;

  @Column({ length: 255, nullable: true, comment: "路由参数" })
  params: string;

  @Column({
    name: "is_deleted",
    type: "tinyint",
    default: 0,
    comment: "逻辑删除标识（0-未删除 1-已删除）",
  })
  isDeleted: number;
}
