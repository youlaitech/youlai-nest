import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from '../../common/schema/baseEntity.schema';

// 定义标签类型枚举
export enum TagType {
  WARNING = 'warning',
  SUCCESS = 'success',
  PRIMARY = 'primary',
  INFO = 'info',
  DANGER = 'danger',
}

@Schema({
  // 指定集合名称
  collection: 'sys_dict',
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: 'createTime',
    updatedAt: 'updateTime',
  },
})
export class Dicts extends BaseEntity {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  dict_code: string;

  @Prop({ type: Number })
  status: number;

  @Prop({ type: String })
  remark: string;
}

@Schema({
  // 指定集合名称
  collection: 'sys_dict_data',
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: 'createTime',
    updatedAt: 'updateTime',
  },
})
export class DictData extends BaseEntity {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'sys_dict',
    comment: ' sys_dict 模型关联',
  })
  dictId: MongooseSchema.Types.ObjectId;
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: String, enum: TagType, default: TagType.INFO })
  tagType: string;

  @Prop({ type: Number })
  status: number;

  @Prop({ type: Number })
  sort: number;

  @Prop({ type: String })
  typeCode: string;
  @Prop({ type: String })
  remark: string;
}

export const dictSchema = SchemaFactory.createForClass(Dicts);
export const dictItemSchema = SchemaFactory.createForClass(DictData);
