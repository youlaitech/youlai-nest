import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../enums/error-code.enum";

// 增强类型定义
type BusinessError =
  | ((typeof ErrorCode)[keyof typeof ErrorCode] & { httpStatus?: HttpStatus })
  | { code: string; msg: string; httpStatus?: HttpStatus };

export class BusinessException extends HttpException {
  constructor(errorInfo: BusinessError);
  constructor(msg: string, httpStatus?: HttpStatus);
  constructor(arg: BusinessError | string, httpStatus?: HttpStatus) {
    if (typeof arg === "string") {
      // 处理字符串参数的重载
      super(
        {
          code: ErrorCode.SYSTEM_ERROR.code,
          msg: arg,
        },
        httpStatus || HttpStatus.BAD_REQUEST
      );
    } else {
      // 处理对象参数的重载
      const statusCode = arg.httpStatus || HttpStatus.BAD_REQUEST;
      super(
        {
          code: arg.code || ErrorCode.SYSTEM_ERROR.code,
          msg: arg.msg || ErrorCode.SYSTEM_ERROR.msg,
        },
        statusCode
      );
    }
  }
}
