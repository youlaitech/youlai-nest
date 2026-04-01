import { AsyncLocalStorage } from "async_hooks";
import type { CurrentUserInfo } from "../interfaces/current-user.interface";
import type { RoleDataScope } from "../models/role-data-scope.model";
import type { DataPermissionConfig } from "../decorators/data-permission.decorator";
export type { DataPermissionConfig };

/** 请求上下文，基于 AsyncLocalStorage 实现请求级隔离 */
export class RequestContext {
  private static asyncLocalStorage = new AsyncLocalStorage<{
    user: CurrentUserInfo;
    dataPermissionConfig: DataPermissionConfig | null;
  }>();

  static setCurrentUser(user: CurrentUserInfo | null): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      store.user =
        user ||
        ({
          userId: "",
          deptId: "",
          deptTreePath: "",
          dataScopes: [],
          roles: [],
        } as CurrentUserInfo);
    }
  }

  static getCurrentUser(): CurrentUserInfo | null {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (!store?.user || !store.user.userId) {
      return null;
    }
    return store.user;
  }

  static getUserId(): string | null {
    return RequestContext.getCurrentUser()?.userId ?? null;
  }

  static getDeptId(): string | null {
    return RequestContext.getCurrentUser()?.deptId ?? null;
  }

  static getDataScopes(): RoleDataScope[] {
    return RequestContext.getCurrentUser()?.dataScopes ?? [];
  }

  static isRoot(): boolean {
    return RequestContext.getCurrentUser()?.isRoot ?? false;
  }

  static setDataPermissionConfig(config: DataPermissionConfig | null): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      store.dataPermissionConfig = config;
    }
  }

  static getDataPermissionConfig(): DataPermissionConfig | null {
    return RequestContext.asyncLocalStorage.getStore()?.dataPermissionConfig ?? null;
  }

  static run<T>(callback: () => T): T {
    return RequestContext.asyncLocalStorage.run(
      {
        user: {
          userId: "",
          deptId: "",
          deptTreePath: "",
          dataScopes: [],
          roles: [],
        },
        dataPermissionConfig: null,
      },
      callback
    );
  }

  static initUserContext(user: CurrentUserInfo): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      store.user = user;
    }
  }
}
