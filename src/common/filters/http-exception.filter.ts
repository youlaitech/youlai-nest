import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { Request, Response } from "express";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ApiException } from "../http-exception/api.exception";
import { BusinessErrorCode } from "../enums/business-error-code.enum";

interface ErrorResponse {
  code: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  params?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 准备错误响应数据
    const errorResponse = this.prepareErrorResponse(exception, request);

    // 记录错误日志
    this.logError(errorResponse, exception);

    // 发送响应
    response.status(HttpStatus.OK).json(errorResponse);
  }

  private prepareErrorResponse(exception: unknown, request: Request): ErrorResponse {
    let code: number;
    let message: string;

    if (exception instanceof ApiException) {
      code = exception.getErrorCode();
      message = exception.getErrorMessage();
    } else if (exception instanceof HttpException) {
      code = exception.getStatus();
      message = exception.message;
    } else {
      code = BusinessErrorCode.BUSINESS_ERROR;
      message = "服务器内部错误";
    }

    return {
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      params: {
        query: request.query,
        body: request.body,
      },
    };
  }

  private logError(errorResponse: ErrorResponse, exception: unknown): void {
    const logContext = {
      ...errorResponse,
      stack: exception instanceof Error ? exception.stack : undefined,
    };

    if (errorResponse.code >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error("Server Error", logContext);
    } else {
      this.logger.warn("Client Error", logContext);
    }
  }
}
