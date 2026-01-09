import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException } from "@nestjs/common";
import { Response } from "express";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../enums/error-code.enum";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const buildResponseBody = (code: string, msg: string) => {
      return {
        code,
        msg,
        data: null,
      };
    };

    // 处理业务异常
    if (exception instanceof BusinessException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const code = exceptionResponse["code"] || ErrorCode.SYSTEM_ERROR.code;
      const msg = exceptionResponse["msg"] || ErrorCode.SYSTEM_ERROR.msg;
      return response.status(status).json(buildResponseBody(code, msg));
    }

    // 处理NestJS内置HTTP异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 对齐 youlai-boot：认证/鉴权错误统一按 401 返回；接口不存在按 404 返回。
      if (status === HttpStatus.UNAUTHORIZED) {
        return response
          .status(HttpStatus.UNAUTHORIZED)
          .json(
            buildResponseBody(
              ErrorCode.ACCESS_TOKEN_INVALID.code,
              ErrorCode.ACCESS_TOKEN_INVALID.msg
            )
          );
      }
      if (status === HttpStatus.FORBIDDEN) {
        return response
          .status(HttpStatus.UNAUTHORIZED)
          .json(
            buildResponseBody(ErrorCode.ACCESS_UNAUTHORIZED.code, ErrorCode.ACCESS_UNAUTHORIZED.msg)
          );
      }
      if (status === HttpStatus.NOT_FOUND) {
        return response
          .status(HttpStatus.NOT_FOUND)
          .json(
            buildResponseBody(ErrorCode.INTERFACE_NOT_EXIST.code, ErrorCode.INTERFACE_NOT_EXIST.msg)
          );
      }

      const msg =
        typeof exceptionResponse === "object"
          ? (exceptionResponse as any).message || ErrorCode.SYSTEM_ERROR.msg
          : (exceptionResponse as any) || ErrorCode.SYSTEM_ERROR.msg;

      return response
        .status(status || HttpStatus.BAD_REQUEST)
        .json(buildResponseBody(ErrorCode.SYSTEM_ERROR.code, msg));
    }

    // 处理其他未捕获异常
    const status = HttpStatus.BAD_REQUEST;
    const error = exception as Error;

    return response
      .status(status)
      .json(
        buildResponseBody(ErrorCode.SYSTEM_ERROR.code, error.message || ErrorCode.SYSTEM_ERROR.msg)
      );
  }
}
