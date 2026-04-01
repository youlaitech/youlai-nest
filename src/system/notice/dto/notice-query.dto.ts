import { IsOptional, IsString } from "class-validator";

import { BaseQueryDto } from "@/common/dto/base-query.dto";

/**
 * 通知公告查询参数
 */
export class NoticeQueryDto extends BaseQueryDto {
  // 关键字
  @IsOptional()
  @IsString()
  keywords?: string;

  // 通知类型
  @IsOptional()
  @IsString()
  type?: string;

  // 通知等级
  @IsOptional()
  @IsString()
  level?: string;

  // 发布状态
  @IsOptional()
  @IsString()
  publishStatus?: string;

  // 是否已读（0 未读，1 已读），供 /api/v1/notices/my 使用
  @IsOptional()
  @IsString()
  isRead?: string;
}
