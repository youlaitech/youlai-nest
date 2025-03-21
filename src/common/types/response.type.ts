export interface Response<T> {
  code: string;
  msg: string;
  data: T;
  timestamp?: number; // 可选时间戳
}
