import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { BaseEntity } from "../common/schema/baseEntity.schema";

// 定义字典数据模型
@Schema({
  collection: "sys_dict",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class Dict extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Number })
  status: number;

  @Prop({ type: String })
  remark: string;
}

export const dictSchema = SchemaFactory.createForClass(Dict);
