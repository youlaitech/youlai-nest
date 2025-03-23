import * as mongoose from "mongoose";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { BaseSchema } from "../../common/schemas/base.schema";
import { Schema as MongooseSchema } from "mongoose";
import { DateFormatService } from "src/utils/service/date-format.service";

@Schema({
  collection: "sys_user",
  timestamps: false,
  toJSON: {
    transform: (_doc, ret) => {
      ret.createTime = DateFormatService.format(ret.createTime, {
        pattern: "YYYY-MM-DD HH:mm",
      });
      ret.updateTime = DateFormatService.format(ret.updateTime, {
        pattern: "YYYY-MM-DD HH:mm:ss",
      });
      delete ret.salt;
      delete ret.password;
      return ret;
    },
  },
})
export class User extends BaseSchema {
  @Prop({ type: String, maxlength: 30 })
  username: string;

  @Prop({ type: String, required: false })
  nickname: string;

  // 性别((1-男 2-女 0-保密)
  @Prop({ type: Number, required: false })
  gender: number;

  @Prop({ type: String, required: true })
  password: string;
  // 部门
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: "sys_dept",
    default: null,
    comment: "部门ID",
  })
  deptId: mongoose.Schema.Types.ObjectId | null;

  @Prop({ type: String, required: false })
  avatar: string;
  @Prop({ type: String, required: false })
  mobile: string;
  @Prop({ type: Number, required: false })
  status: number; // 状态((1-正常 0-禁用)
  // 邮箱
  @Prop({ type: String, required: false })
  email: string;

  @Prop({
    type: MongooseSchema.Types.String,
    validate: {
      validator: function (v: string) {
        return v !== null; // 只要不是 null，就认为是有效的
      },
      message: "账号部门树路径不能为空",
    },
    default: "", // 默认值为空字符串
    comment: "账号部门树路径，用于权限管理，当前账号的权限",
  })
  UserDeptTreePath?: string;
  @Prop({ type: String, required: true, comment: "路径" })
  deptTreePath: string;
  @Prop({ type: String, required: false })
  salt: string;
  @Prop({ type: [String], default: [], comment: "权限" })
  perms: string[]; // 权限
  @Prop()
  roleIds?: mongoose.Schema.Types.ObjectId[];

  roles?: string[];
}
export const UserSchema = SchemaFactory.createForClass(User);
