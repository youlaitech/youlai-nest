import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

import { BaseEntity } from "../common/schema/baseEntity.schema";

@Schema({
  collection: "sys_user_role", // 指定集合名称
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class Roles extends BaseEntity {
  // 角色名称
  @Prop({
    type: String,
    required: true,
    maxlength: 64,
    default: "",
    comment: "角色名称",
  })
  name: string;
  // 角色编码
  @Prop({
    type: String,
    required: true,
    maxlength: 32,
    comment: "角色编码",
  })
  code: string;
  // 显示顺序
  @Prop({
    type: Number,
    default: null,
    comment: "显示顺序",
  })
  sort: number | null;
  // 角色状态 (1-正常 0-停用)
  @Prop({
    type: Number,
    default: 1,
    comment: "角色状态(1-正常 0-停用)",
  })
  status: number;
  // 数据权限 (0-所有数据 1-部门及子部门数据 2-本部门数据 3-本人数据)
  @Prop({
    type: Number,
    default: null,
    comment: "数据权限(0-所有数据 1-部门及子部门数据 2-本部门数据 3-本人数据)",
  })
  dataScope: number | null;

  @Prop({
    type: [String],
    ref: "sys_menu",
    default: [],
    comment: "角色拥有的菜单项",
  })
  menus: string[];
}

export const RoleSchema = SchemaFactory.createForClass(Roles);
