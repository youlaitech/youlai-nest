import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import { BusinessException } from "../common/exceptions/business.exception";
import { ResultCode } from "../common/enums/result-code.enum";

@Injectable()
export class AuthGuard extends PassportAuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization;

    if (!token) {
      throw new BusinessException(ResultCode.ACCESS_TOKEN_INVALID);
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new BusinessException(ResultCode.ACCESS_TOKEN_INVALID);
    }
    return user;
  }
}
