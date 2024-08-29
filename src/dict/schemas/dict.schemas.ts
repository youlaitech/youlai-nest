import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { BaseEntity } from '../../common/schema/baseEntity.schema';

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
  code: string;

  @Prop({ type: Number })
  status: number;

  @Prop({ type: String })
  remark: string;
}
@Schema({
  // 指定集合名称
  collection: 'sys_dict_items',
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: 'createTime',
    updatedAt: 'updateTime',
  },
})
export class DictItems extends BaseEntity {
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
export const dictItemSchema = SchemaFactory.createForClass(DictItems);
