import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException } from "@nestjs/common";
import { Response } from "express";
import { BusinessException } from "../exceptions/business.exception";
import { ErrorCode } from "../enums/error-code.enum";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isDuplicateEntryError = (ex: unknown): boolean => {
      if (!ex || typeof ex !== "object") return false;
      const anyEx = ex as any;
      const code = anyEx.code;
      const errno = anyEx.errno;
      const message = anyEx.message;
      // MySQL: ER_DUP_ENTRY / errno: 1062
      if (code === "ER_DUP_ENTRY" || errno === 1062) return true;
      if (typeof message === "string" && message.includes("Duplicate entry")) return true;
      return false;
    };

    const normalizeMsg = (value: unknown): string => {
      if (Array.isArray(value)) {
        const items = value
          .map((v) => (v === null || v === undefined ? "" : String(v)).trim())
          .filter((v) => v.length > 0);
        if (items.length > 0) return items.join("；");
        return ErrorCode.SYSTEM_ERROR.msg;
      }
      if (typeof value === "string") return value;
      if (value === null || value === undefined) return ErrorCode.SYSTEM_ERROR.msg;
      return String(value);
    };

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

      // 认证/鉴权错误按 401 返回，接口不存在按 404 返回
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

      const msgRaw =
        typeof exceptionResponse === "object"
          ? ((exceptionResponse as any).message ?? ErrorCode.SYSTEM_ERROR.msg)
          : ((exceptionResponse as any) ?? ErrorCode.SYSTEM_ERROR.msg);
      const msg = normalizeMsg(msgRaw);

      if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
        return response
          .status(status)
          .json(buildResponseBody(ErrorCode.USER_REQUEST_PARAMETER_ERROR.code, msg));
      }

      return response
        .status(status || HttpStatus.BAD_REQUEST)
        .json(buildResponseBody(ErrorCode.SYSTEM_ERROR.code, msg));
    }

    // 数据库唯一约束冲突等（TypeORM QueryFailedError 通常会落到这里）
    if (isDuplicateEntryError(exception)) {
      return response
        .status(HttpStatus.BAD_REQUEST)
        .json(buildResponseBody(ErrorCode.INTEGRITY_CONSTRAINT_VIOLATION.code, "数据已存在"));
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
