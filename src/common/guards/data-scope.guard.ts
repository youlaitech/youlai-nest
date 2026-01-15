import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { RequestContext } from "../context/request-context";

@Injectable()
export class DataScopeGuard implements CanActivate {
  private readonly reflector: Reflector;

  constructor(reflector: Reflector) {
    this.reflector = reflector;
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      RequestContext.setCurrentUser(null);
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user || request["user"];

    const userIdRaw = user?.userId;
    const deptIdRaw = user?.deptId;
    const userId =
      userIdRaw === undefined || userIdRaw === null || userIdRaw === ""
        ? undefined
        : String(userIdRaw);
    const deptId =
      deptIdRaw === undefined || deptIdRaw === null || deptIdRaw === "" ? null : String(deptIdRaw);
    const deptTreePath = user?.deptTreePath ?? null;
    const dataScope = user?.dataScope ?? null;

    if (!userId) {
      RequestContext.setCurrentUser(null);
      return true;
    }

    RequestContext.setCurrentUser({
      userId,
      deptId,
      deptTreePath,
      dataScope,
    });

    return true;
  }
}
