export interface Response<T> {
  code: string;
  msg: string;
  data: T;
}
