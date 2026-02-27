import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { CurrentUserInfo } from "../interfaces/current-user.interface";

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user[data] : request.user;
  }
);
