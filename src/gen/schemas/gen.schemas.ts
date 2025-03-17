import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import mongoose from "mongoose";

@Schema({
  // 指定集合名称
  collection: "sys_dict",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class Dicts extends Document {
  // @Prop({ type: mongoose.Schema.Types.ObjectId })
  // _id: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  code: string;

  @Prop({ type: Number })
  status: number;
  @Prop({ type: mongoose.Schema.Types.String, default: Date.now() })
  createTime: string;
  @Prop({ type: mongoose.Schema.Types.String, default: Date.now() })
  updateTime: string;

  @Prop({ type: String })
  remark: string;
}
@Schema({
  // 指定集合名称
  collection: "sys_dict_items",
  timestamps: {
    currentTime: () => Date.now(),
    createdAt: "createTime",
    updatedAt: "updateTime",
  },
})
export class DictData extends Document {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  value: string;
  @Prop({ type: Number })
  status: number;

  @Prop({ type: Number })
  sort: number;
  @Prop({ type: mongoose.Schema.Types.String, default: Date.now() })
  createTime: string;
  @Prop({ type: mongoose.Schema.Types.String, default: Date.now() })
  updateTime: string;

  @Prop({ type: String })
  typeCode: string;
  @Prop({ type: String })
  remark: string;
}

export const dictSchema = SchemaFactory.createForClass(Dicts);
export const dictItemSchema = SchemaFactory.createForClass(DictData);
//  @Prop({
//     type: [
//       {
//         sort: Number,
//         name: String,
//         value: String,
//         status: Number,
//         remark: String,
//         typeCode: String,
//         createTime: { type: Number, default: () => Date.now() },
//         updateTime: { type: Number, default: () => Date.now() },
//       },
//     ],
//   })
//   dictItem: Array<{
//     sort: number;
//     name: string;
//     value: string;
//     status: number;
//     remark: string;
//     typeCode: string;
//     createTime: number;
//     updateTime: number;
//   }>;
