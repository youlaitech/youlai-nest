import { AsyncLocalStorage } from "async_hooks";
import { RoleDataScope } from "../models/role-data-scope.model";

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
  private static asyncLocalStorage = new AsyncLocalStorage<CurrentUserContext>();
  private static currentDataPermissionConfig: DataPermissionConfig | null = null;

  static setCurrentUser(user: CurrentUserContext | null): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, user || {});
    }
  }

  static getCurrentUser(): CurrentUserContext | null {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (!store || !store.userId) {
      return null;
    }
    return store;
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
    RequestContext.currentDataPermissionConfig = config;
  }

  static getDataPermissionConfig(): DataPermissionConfig | null {
    return RequestContext.currentDataPermissionConfig;
  }

  static run<T>(callback: () => T): T {
    const emptyContext: CurrentUserContext = {
      userId: "",
      deptId: null,
      deptTreePath: null,
      dataScopes: [],
      roles: [],
      perms: [],
      isRoot: false,
    };
    return RequestContext.asyncLocalStorage.run(emptyContext, callback);
  }

  static initUserContext(user: CurrentUserContext): void {
    const store = RequestContext.asyncLocalStorage.getStore();
    if (store) {
      Object.assign(store, user);
    }
  }
}
