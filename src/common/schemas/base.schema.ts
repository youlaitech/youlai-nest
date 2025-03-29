import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({
  timestamps: {
    createdAt: "createTime",
    updatedAt: "updateTime",
    currentTime: () => new Date(),
  },
  versionKey: false,
})
export class BaseSchema extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    auto: true,
    comment: "MongoDB 文档的唯一标识符，自动生成",
  })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({
    type: Number,
    default: 0,
    comment: "逻辑删除标识(1-已删除 0-未删除)",
  })
  isDeleted: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "sys_user",
    comment: "创建者的 _id，与 sys_user 模型关联",
  })
  createBy: MongooseSchema.Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "sys_user",
    comment: "最后一次修改者的 _id，与 sys_user 模型关联",
  })
  updateBy: MongooseSchema.Types.ObjectId;
}

export const BaseEntitySchema = SchemaFactory.createForClass(BaseSchema);
