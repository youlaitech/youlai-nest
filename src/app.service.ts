import { Injectable } from "@nestjs/common";

/**
 * 应用基础服务
 */
@Injectable()
export class AppService {
  getHello(): string {
    return "Hello World!";
  }
}
