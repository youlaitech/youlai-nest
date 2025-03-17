import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import mongoose from "mongoose";
import { BaseEntity } from "../common/schema/baseEntity.schema";

@Schema({
  collection: "sys_menu",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class Menus extends BaseEntity {
  // 父级id
  @Prop({
    type: mongoose.Schema.Types.Mixed,
    ref: "Menus",
    default: null,
    comment: "父菜单ID",
  })
  parentId: mongoose.Types.ObjectId | string | null;

  // 创建者部门树路径
  @Prop({ type: String, default: null, comment: "创建者部门树路径" })
  deptTreePath: string | null;

  // 菜单名称
  @Prop({ type: String, required: true, maxlength: 64, comment: "菜单名称" })
  name: string;

  // 菜单类型（1-菜单 2-目录 3-外链 4-按钮）
  @Prop({
    type: Number,
    required: true,
    comment: "菜单类型（1-菜单 2-目录 3-外链 4-按钮）",
  })
  type: number;

  // 路由名称（Vue Router 中用于命名路由）
  @Prop({
    type: String,
    default: null,
    maxlength: 255,
    comment: "路由名称（Vue Router 中用于命名路由）",
  })
  routeName: string | null;

  // 路由路径（Vue Router 中定义的 URL 路径）
  @Prop({
    type: String,
    maxlength: 128,
    comment: "路由路径（Vue Router 中定义的 URL 路径）",
  })
  routePath?: string;

  // 组件路径（组件页面完整路径，相对于 src/views/，缺省后缀 .vue）
  @Prop({
    type: String,
    default: null,
    maxlength: 128,
    comment: "组件路径（组件页面完整路径，相对于 src/views/，缺省后缀 .vue）",
  })
  component: string | null;

  // 权限标识
  @Prop({
    type: String,
    default: null,
    maxlength: 128,
    comment: "【按钮】权限标识",
  })
  perm: string | null;

  // 目录是否始终显示（1-是 0-否）
  @Prop({
    type: Number,
    default: 1,
    comment: "【目录】只有一个子路由是否始终显示（1-是 0-否）",
  })
  alwaysShow: number;

  // 菜单是否开启页面缓存（1-是 0-否）
  @Prop({
    type: Number,
    default: false,
    comment: "【菜单】是否开启页面缓存（1-是 0-否）",
  })
  keepAlive: number;

  // 显示状态（1-显示 0-隐藏）
  @Prop({ type: Number, default: true, comment: "显示状态（1-显示 0-隐藏）" })
  visible: number;

  // 排序
  @Prop({ type: Number, default: 0, comment: "显示排序" })
  sort: number;

  // 菜单图标
  @Prop({ type: String, default: "", maxlength: 64, comment: "菜单图标" })
  icon: string;

  // 跳转路径
  @Prop({ type: String, default: null, maxlength: 128, comment: "跳转路径" })
  redirect: string | null;

  // 路由参数
  @Prop({ type: JSON, default: null, comment: "路由参数" })
  params: JSON | null;
}

export type MenuDocument = Menus & Document;
export const MenuSchema = SchemaFactory.createForClass(Menus);
