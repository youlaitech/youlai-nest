import { ApiProperty } from "@nestjs/swagger";

/**
 * 日志分页项
 */
export class LogPageDto {
  @ApiProperty({ description: "主键" })
  id: string;

  @ApiProperty({ description: "模块" })
  module: string | null;

  @ApiProperty({ description: "操作类型" })
  actionType: string | null;

  @ApiProperty({ description: "操作标题" })
  title: string | null;

  @ApiProperty({ description: "自定义日志内容" })
  content: string | null;

  @ApiProperty({ description: "操作人ID" })
  operatorId: string | null;

  @ApiProperty({ description: "操作人名称" })
  operatorName: string | null;

  @ApiProperty({ description: "状态：0失败 1成功" })
  status: number | null;

  @ApiProperty({ description: "请求路径" })
  requestUri: string | null;

  @ApiProperty({ description: "请求方式" })
  requestMethod: string | null;

  @ApiProperty({ description: "IP 地址" })
  ip: string | null;

  @ApiProperty({ description: "地区" })
  region: string | null;

  @ApiProperty({ description: "设备" })
  device: string | null;

  @ApiProperty({ description: "操作系统" })
  os: string | null;

  @ApiProperty({ description: "浏览器" })
  browser: string | null;

  @ApiProperty({ description: "执行时间(毫秒)" })
  executionTime: number | null;

  @ApiProperty({ description: "错误信息" })
  errorMsg: string | null;

  @ApiProperty({ description: "创建时间", example: "2025-01-01 12:00:00" })
  createTime: string | null;
}
