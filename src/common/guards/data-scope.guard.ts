import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtPayload } from "../../auth/interfaces/jwt-payload.interface";
import { FilterQuery } from "mongoose";

@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const user = request.user as JwtPayload;

    const userId = user.sub;
    const deptId = user.deptId;
    const deptTreePath = user.deptTreePath;
    const dataScope = user.dataScope;

    const resource = this.reflector.get<string>("resource", context.getHandler()); // 获取资源名称，用户表：sys_user

    request.dataFilter = this.buildDataFilter(dataScope, deptTreePath, deptId, userId, resource);
    return true;
  }

  private buildDataFilter(
    dataScope: number,
    deptTreePath: string,
    deptId: string,
    userId: string,
    resource: string
  ): FilterQuery<any> {
    const filter: FilterQuery<any> = {};
    // 部门字段映射：部门表用_id，其他表用deptId
    const deptField = resource === "sys_dept" ? "_id" : "deptId";
    const deptTreeField = resource === "sys_dept" ? "treePath" : "deptTreePath";

    switch (dataScope) {
      case DataScopeEnum.ALL:
        break;
      case DataScopeEnum.DEPT_TREE:
        // 精确路径匹配：以当前路径开头，如0,1,2 匹配 0,1,2 或 0,1,2,3
        filter[deptTreeField] = new RegExp(`^${deptTreePath}(,|$)`);
        break;
      case DataScopeEnum.CURRENT_DEPT:
        filter[deptField] = deptId;
        break;
      case DataScopeEnum.SELF:
        filter.createBy = userId;
        break;
      default: // 未知类型严格过滤
        filter._id = null;
        break;
    }

    return filter;
  }
}
