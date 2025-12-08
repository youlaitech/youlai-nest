import { IsOptional, IsString } from "class-validator";

export class NoticePageQueryDto {
  // 页码（前端以字符串形式传递，这里不做数值约束，在 Service 中自行 Number() 转换）
  @IsOptional()
  @IsString()
  pageNum?: string;

  // 每页条数（同上，不在 DTO 层做强约束）
  @IsOptional()
  @IsString()
  pageSize?: string;

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
