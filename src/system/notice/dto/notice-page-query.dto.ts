export class NoticePageQueryDto {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  type?: number;
  level?: string;
  publishStatus?: number;
}
