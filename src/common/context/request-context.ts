import { AsyncLocalStorage } from "async_hooks";
import type { RoleDataScope } from "../models/role-data-scope.model";

/** 当前用户上下文 */
export interface CurrentUserContext {
  /** 用户ID */
  userId: string;
  /** 部门ID */
  deptId: string | null;
  /** 部门树路径 */
  deptTreePath: string | null;
  /** 角色数据权限列表 */
  dataScopes: RoleDataScope[];
  /** 角色编码列表 */
  roles?: string[];
  /** 权限标识列表 */
  perms?: string[];
  /** 是否为超级管理员 */
  isRoot?: boolean;
}

/** 数据权限装饰器配置 */
export interface DataPermissionConfig {
  /** 部门表别名 */
  deptAlias?: string;
  /** 部门ID字段名 */
  deptIdColumnName?: string;
  /** 用户表别名 */
  userAlias?: string;
  /** 用户ID字段名 */
  userIdColumnName?: string;
}

/** 请求上下文，基于 AsyncLocalStorage 实现请求级隔离 */
export class RequestContext {
  private static asyncLocalStorage = new AsyncLocalStorage<{
    user: CurrentUserContext;
    dataPermissionConfig: DataPermissionConfig | null;
  }>();

  static setCurrentUser(user: CurrentUserContext | null): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      store.user =
        user ||
        ({
          userId: "",
          deptId: null,
          deptTreePath: null,
          dataScopes: [],
          roles: [],
          perms: [],
          isRoot: false,
        } as CurrentUserContext);
    }
  }

  static getCurrentUser(): CurrentUserContext | null {
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
          deptId: null,
          deptTreePath: null,
          dataScopes: [],
          roles: [],
          perms: [],
          isRoot: false,
        },
        dataPermissionConfig: null,
      },
      callback
    );
  }

  static initUserContext(user: CurrentUserContext): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      store.user = user;
    }
  }
}
