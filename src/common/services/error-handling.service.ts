import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { MongoError } from 'mongodb';
import { BusinessErrorCode } from '../enums/business-error-code.enum';
import { ApiException } from '../http-exception/api.exception';

interface ErrorContext {
  module: string;
  method: string;
  params?: any;
}

@Injectable()
export class ErrorHandlingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 处理错误并返回统一的异常响应
   * @param error 错误对象
   * @param context 错误上下文
   */
  handleError(error: any, context: ErrorContext): never {
    // 记录错误日志
    this.logError(error, context);

    // 根据错误类型返回对应的异常
    if (error instanceof ApiException) {
      throw error;
    }

    if (error instanceof MongoError) {
      throw this.handleMongoError(error);
    }

    // 处理其他类型的错误
    throw this.handleUnknownError(error);
  }

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 错误上下文
   */
  private logError(error: any, context: ErrorContext): void {
    const errorLog = {
      timestamp: new Date().toISOString(),
      module: context.module,
      method: context.method,
      params: context.params,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    this.logger.error('Error occurred', errorLog);
  }

  /**
   * 处理 MongoDB 错误
   * @param error MongoDB 错误对象
   */
  private handleMongoError(error: MongoError): ApiException {
    switch (error.code) {
      case 11000:
        return new ApiException(
          '数据已存在，请检查唯一字段',
          BusinessErrorCode.DB_DUPLICATE_KEY,
        );
      default:
        return new ApiException(
          '数据库操作失败',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
    }
  }

  /**
   * 处理未知错误
   * @param error 错误对象
   */
  private handleUnknownError(error: any): ApiException {
    return new ApiException(
      error.message || '服务器内部错误',
      BusinessErrorCode.BUSINESS_ERROR,
    );
  }

  /**
   * 创建错误上下文
   * @param module 模块名称
   * @param method 方法名称
   * @param params 参数
   */
  createErrorContext(
    module: string,
    method: string,
    params?: any,
  ): ErrorContext {
    return {
      module,
      method,
      params,
    };
  }
}
