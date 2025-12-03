import { PartialType } from "@nestjs/swagger";

export class CreateNoticeDto {
  title: string;
  content: string;
  type: number;
  level: string;
  targetType: number;
  targetUserIds?: string;
}

export class UpdateNoticeDto extends PartialType(CreateNoticeDto) {}
