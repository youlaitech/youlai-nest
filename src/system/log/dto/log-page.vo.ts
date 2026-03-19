import { ApiProperty } from "@nestjs/swagger";

/**
 * 日志分页项
 */
export class LogPageVo {
  @ApiProperty({ description: "主键" })
  id: string;

  @ApiProperty({ description: "行为类型" })
  actionType: string;

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

  @ApiProperty({ description: "创建人ID" })
  createBy: string | null;

  @ApiProperty({ description: "创建时间", example: "2025-01-01 12:00:00" })
  createTime: string | null;

  @ApiProperty({ description: "操作人" })
  operator: string | null;
}
