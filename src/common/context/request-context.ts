export interface CurrentUserContext {
  userId: number;
  deptId: number | null;
  deptTreePath: string | null;
  dataScope: number | null;
}

/**
 * 简单的请求上下文容器，用于在 TypeORM 查询阶段读取当前用户的数据范围。 
 * 注意：基于静态变量的实现会在高并发下有局限，如需更严格隔离可以升级为 AsyncLocalStorage。
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
