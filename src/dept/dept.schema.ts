import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { BaseEntity } from "../common/schema/baseEntity.schema";

@Schema({
  collection: "sys_dept",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class Dept extends BaseEntity {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: String,
    required: true,
    default: "",
    comment: "部门名称",
  })
  name: string;
  @Prop({
    type: String,
    required: true,
    unique: true,
    comment: "部门编号",
  })
  code: string;
  @Prop({
    type: mongoose.Schema.Types.Mixed, // 允许任意类型
    validate: {
      validator: function (value: any) {
        // 如果值不是 '0'，则检查它是否是有效的 ObjectId
        return value === 0 || Types.ObjectId.isValid(value);
      },
      message: (props) => `${props.value} 不是有效的ObjectId或"0"`,
    },
    default: null,
    comment: "父节点id",
  })
  parentId: mongoose.Schema.Types.ObjectId | number;
  @Prop({
    default: "",
    comment: "父节点id路径",
  })
  TreePath: string;
  @Prop({ type: Number, default: 0, comment: "显示顺序" })
  sort: number;
  @Prop({ type: Number, default: 1, comment: "状态(1-正常 0-禁用)" })
  status: number;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "sys_user",
    default: null,
    comment: "创建人ID",
  })
  createBy: mongoose.Schema.Types.ObjectId;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "sys_user",
    default: null,
    comment: "创建人ID",
  })
  updateBy: mongoose.Schema.Types.ObjectId;
}

export const deptSchema = SchemaFactory.createForClass(Dept);
