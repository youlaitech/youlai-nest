import { ApiProperty } from "@nestjs/swagger";

export class LogPageVo {
  @ApiProperty({ description: "主键" })
  id: string;

  @ApiProperty({ description: "日志模块" })
  module: string;

  @ApiProperty({ description: "日志内容" })
  content: string;

  @ApiProperty({ description: "请求路径" })
  requestUri: string | null;

  @ApiProperty({ description: "请求方法" })
  method: string | null;

  @ApiProperty({ description: "IP 地址" })
  ip: string | null;

  @ApiProperty({ description: "地区" })
  region: string | null;

  @ApiProperty({ description: "浏览器" })
  browser: string | null;

  @ApiProperty({ description: "终端系统" })
  os: string | null;

  @ApiProperty({ description: "执行时间(毫秒)" })
  executionTime: string | null;

  @ApiProperty({ description: "创建人ID" })
  createBy: string | null;

  @ApiProperty({ description: "创建时间", example: "2025-01-01 12:00:00" })
  createTime: string | null;

  @ApiProperty({ description: "操作人" })
  operator: string | null;
}
