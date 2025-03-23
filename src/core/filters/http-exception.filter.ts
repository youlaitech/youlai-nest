import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException } from "@nestjs/common";
import { Request, Response } from "express";
import { BusinessException } from "../../common/exceptions/business.exception";
import { ResultCode } from "../../common/enums/result-code.enum";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 生产环境安全响应
    const isProduction = process.env.NODE_ENV === "prod";
    const safeMessage = isProduction ? "服务器开小差了～" : undefined;

    // 构造基础响应体
    const responseBody: Record<string, any> = {
      data: null,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    // 处理业务异常
    if (exception instanceof BusinessException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      Object.assign(responseBody, {
        code: exceptionResponse["code"] || ResultCode.SYSTEM_ERROR.code,
        msg: exceptionResponse["msg"] || safeMessage,
      });

      return response.status(status).json(responseBody);
    }

    // 处理NestJS内置HTTP异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      Object.assign(responseBody, {
        code: ResultCode.SYSTEM_ERROR.code,
        msg:
          typeof exceptionResponse === "object"
            ? (exceptionResponse as any).message || safeMessage
            : exceptionResponse,
      });

      return response.status(status).json(responseBody);
    }

    // 处理其他未捕获异常
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const error = exception as Error;

    Object.assign(responseBody, {
      code: ResultCode.SYSTEM_ERROR.code,
      msg: isProduction ? safeMessage : error.message,
      stack: isProduction ? undefined : error.stack, // 非生产环境返回堆栈
    });

    return response.status(status).json(responseBody);
  }
}
