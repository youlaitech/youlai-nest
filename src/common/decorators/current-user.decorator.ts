import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { CurrentUserInfo } from "../interfaces/current-user.interface";

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user[data] : request.user;
  }
);
