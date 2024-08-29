import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Logger } from 'winston';
import { ApiException } from './api.exception';
import { getReqMainInfo } from '../../utils/utils';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const msg = (exception as any)?.response?.message?.join
      ? (exception as any)?.response?.message[0]
      : exception.message;
    // 记录日志（错误消息，错误码，请求信息等）
    // .error(msg + '999', {
    //     status,
    //     req: getReqMainInfo(request),
    //     // stack: exception.stack,
    //   });
    this.logger.error(msg, {
      status,
      req: getReqMainInfo(request),
    });
    if (exception instanceof ApiException) {
      response.status(status).json({
        code: exception.getErrorCode(),
        timestamp: new Date().toISOString(),
        path: request.url,
        msg: exception.getErrorMessage(),
      });
      return;
    }
    response.status(status).json({
      code: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      msg: msg,
    });
  }
}
