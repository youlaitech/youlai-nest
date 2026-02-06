export interface CurrentUserContext {
  userId: string;
  deptId: string | null;
  deptTreePath: string | null;
  dataScope: number | null;
}

/**
 * 请求上下文容器，用于查询阶段读取当前用户数据范围
 * 静态变量方案在高并发下有局限，可升级为 AsyncLocalStorage
 */
export class RequestContext {
  static currentUser: CurrentUserContext | null = null;

  static setCurrentUser(user: CurrentUserContext | null) {
    RequestContext.currentUser = user;
  }

  static getCurrentUser(): CurrentUserContext | null {
    return RequestContext.currentUser;
  }
}
