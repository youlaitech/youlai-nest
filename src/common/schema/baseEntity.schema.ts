import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class BaseEntity extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    auto: true,
    comment: "MongoDB 文档的唯一标识符，自动生成",
  })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
    comment: "逻辑删除标识，0 表示未删除，1 表示已删除",
  })
  isDeleted: number;

  @Prop({
    type: MongooseSchema.Types.String,
    required: [true, "部门树路径是必填项"],
    validate: {
      validator: function (v: string) {
        return v !== null; // 只要不是 null，就认为是有效的
      },
      message: "部门树路径不能为空",
    },
    default: "", // 默认值为空字符串
    comment: "部门树路径，用于权限管理，表示创建者的部门层级路径",
  })
  deptTreePath?: string;
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "sys_user",
    required: true,
    comment: "创建者的 _id，与 sys_user 模型关联",
  })
  createBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "sys_user",
    // required: true,
    comment: "最后一次修改者的 _id，与 sys_user 模型关联",
  })
  updateBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
    comment: "创建时间的时间戳，文档创建时自动生成",
  })
  createTime: number;

  @Prop({
    type: Number,
    default: () => Math.floor(Date.now() / 1000),
    comment: "更新时间的时间戳，文档每次更新时自动更新",
  })
  updateTime: number;
}

export const BaseEntitySchema = SchemaFactory.createForClass(BaseEntity);

// 针对文档保存和更新的中间件，确保 updateTime 在每次文档更新时自动更新
BaseEntitySchema.pre("save", function (next) {
  this.updateTime = Math.floor(Date.now() / 1000);
  next();
});

BaseEntitySchema.pre("findOneAndUpdate", function (next) {
  this.set({ updateTime: Math.floor(Date.now() / 1000) });
  next();
});
