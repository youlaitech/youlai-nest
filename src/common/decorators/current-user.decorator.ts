import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthUser } from "../interfaces/auth-user.interface";

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException("用户认证信息缺失");
    }

    return data ? user[data] : user;
  }
);
