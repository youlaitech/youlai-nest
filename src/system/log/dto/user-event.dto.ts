import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsDateString, IsInt, Min } from "class-validator";

export enum ActionTypeEnum {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  CHANGE_PWD = "CHANGE_PWD",
  UPDATE_PROFILE = "UPDATE_PROFILE",
}

export class UserEventQueryDto {
  @ApiProperty({ description: "页码", required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNum?: number;

  @ApiProperty({ description: "每页数量", required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiProperty({ description: "行为类型", required: false, enum: ActionTypeEnum })
  @IsOptional()
  @IsEnum(ActionTypeEnum)
  actionType?: ActionTypeEnum;

  @ApiProperty({ description: "开始日期", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: "结束日期", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UserEventVo {
  @ApiProperty({ description: "主键" })
  id: string;

  @ApiProperty({ description: "行为类型" })
  actionType: string;

  @ApiProperty({ description: "状态：0失败 1成功" })
  status: number;

  @ApiProperty({ description: "设备" })
  device: string;

  @ApiProperty({ description: "操作系统" })
  os: string;

  @ApiProperty({ description: "浏览器" })
  browser: string;

  @ApiProperty({ description: "IP 地址" })
  ip: string;

  @ApiProperty({ description: "地区" })
  region: string;

  @ApiProperty({ description: "创建时间" })
  createTime: string;
}

export class LoginDeviceVo {
  @ApiProperty({ description: "设备" })
  device: string;

  @ApiProperty({ description: "操作系统" })
  os: string;

  @ApiProperty({ description: "浏览器" })
  browser: string;

  @ApiProperty({ description: "IP 地址" })
  ip: string;

  @ApiProperty({ description: "地区" })
  region: string;

  @ApiProperty({ description: "登录次数" })
  loginCount: number;

  @ApiProperty({ description: "最近登录时间" })
  lastLoginTime: string;
}
