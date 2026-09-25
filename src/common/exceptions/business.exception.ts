import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "../enums/error-code.enum";

// 异常入参：ErrorCode 中的某一项，或自定义 code/msg
type BusinessError =
  | ((typeof ErrorCode)[keyof typeof ErrorCode] & { httpStatus?: HttpStatus })
  | { code: string; msg: string; httpStatus?: HttpStatus };

export class BusinessException extends HttpException {
  constructor(errorInfo: BusinessError);
  constructor(msg: string, httpStatus?: HttpStatus);
  constructor(arg: BusinessError | string, httpStatus?: HttpStatus) {
    if (typeof arg === "string") {
      super(
        {
          code: ErrorCode.SYSTEM_ERROR.code,
          msg: arg,
        },
        httpStatus || HttpStatus.BAD_REQUEST
      );
    } else {
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
