import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { RequestContext } from "../context/request-context";

@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

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

    const userId = user?.userId;
    const deptId = user?.deptId ?? null;
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
