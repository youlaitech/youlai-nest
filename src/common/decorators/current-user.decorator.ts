import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user[data] : request.user;
  }
);
