import { ApiProperty } from "@nestjs/swagger";

export class LogPageQueryDto {
  @ApiProperty({ description: "页码", example: 1 })
  pageNum: number;

  @ApiProperty({ description: "每页大小", example: 10 })
  pageSize: number;

  @ApiProperty({
    description: "关键字(日志内容/请求路径/请求方法/地区/浏览器/终端系统)",
    required: false,
  })
  keywords?: string;

  @ApiProperty({ description: "操作时间范围 [开始, 结束]", required: false, type: [String] })
  createTime?: string[];
}
