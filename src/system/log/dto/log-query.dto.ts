import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";

import { BaseQueryDto } from "@/common/dto/base-query.dto";

/**
 * 日志查询参数
 */
export class LogQueryDto extends BaseQueryDto {
  @ApiProperty({
    description: "关键字(日志内容/请求路径/请求方法/地区/浏览器/终端系统)",
    required: false,
  })
  @IsOptional()
  keywords?: string;

  @ApiProperty({ description: "操作时间范围 [开始, 结束]", required: false, type: [String] })
  @IsOptional()
  // transform incoming query array to remove empty strings and normalize single value to array
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      const filtered = value.map((v) => (v === "" ? undefined : v)).filter(Boolean);
      return filtered.length ? filtered : undefined;
    }
    if (value === "" || value === undefined || value === null) return undefined;
    return [value];
  })
  createTime?: string[];
}
