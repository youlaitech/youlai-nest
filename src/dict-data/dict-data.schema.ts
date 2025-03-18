import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { BaseEntity } from "../common/schema/baseEntity.schema";

// 定义标签类型枚举
export enum TagType {
  WARNING = "warning",
  SUCCESS = "success",
  PRIMARY = "primary",
  INFO = "info",
  DANGER = "danger",
}

// 定义字典数据模型
@Schema({
  collection: "sys_dict_data",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class DictData extends BaseEntity {
  @Prop({ type: String, required: true })
  dictCode: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: String, required: true })
  label: string;

  @Prop({ type: String, enum: TagType, default: TagType.INFO })
  tagType: string;

  @Prop({ type: Number })
  status: number;

  @Prop({ type: Number })
  sort: number;

  @Prop({ type: String })
  remark: string;
}

export const dictDataSchema = SchemaFactory.createForClass(DictData);
