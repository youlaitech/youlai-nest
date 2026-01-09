export interface Response<T> {
  code: string;
  msg: string;
  data: T;
  page?: {
    pageNum: number;
    pageSize: number;
    total: number;
  };
}
