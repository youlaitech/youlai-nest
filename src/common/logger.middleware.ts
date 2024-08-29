import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { getReqMainInfo } from '../utils/utils';

@Injectable()
export default class LoggerMiddleware implements NestMiddleware {
  // 注入日志服务相关依赖
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    // 获取请求信息
    const {
      query,
      headers: { host },
      url,
      method,
      body,
    } = req;

    // 记录日志
    // 这里做后期日志的详细划分
    this.logger.info('route', {
      url,
      method,
      query,
      body,
      req: getReqMainInfo(req),
    });

    next();
  }
}
