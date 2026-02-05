import { PartialType } from "@nestjs/swagger";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * 通知公告创建参数
 */
export class CreateNoticeDto {
  /** 通知标题 */
  @IsNotEmpty()
  @IsString()
  title: string;

  /** 通知内容 */
  @IsNotEmpty()
  @IsString()
  content: string;

  /** 通知类型 */
  @IsNotEmpty()
  @IsInt()
  type: number;

  /** 通知等级 */
  @IsNotEmpty()
  @IsString()
  level: string;

  /** 目标类型（1-全体 2-指定） */
  @IsNotEmpty()
  @IsInt()
  targetType: number;

  /** 目标用户ID列表 */
  @IsOptional()
  @IsArray()
  targetUserIds?: number[];
}

/**
 * 通知公告更新参数
 */
export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
