import { SelectQueryBuilder } from "typeorm";
import { RequestContext } from "../context/request-context";
import type { DataPermissionConfig } from "../context/request-context";
import { DataScopeUtils } from "../../common/models/role-data-scope.model";
import type { RoleDataScope } from "../../common/models/role-data-scope.model";
import { DataScopeEnum } from "../../common/enums/data-scope.enum";

/**
 * 数据权限处理器
 * 支持多角色数据权限合并（OR连接各角色条件）
 */
export class DataPermissionHandler {
  private static hasAlias<T>(qb: SelectQueryBuilder<T>, alias?: string): boolean {
    const aliasName = alias?.trim();
    if (!aliasName) return true;
    const aliases = (qb as any)?.expressionMap?.aliases;
    // 如果无法读取 QueryBuilder 的 alias 列表，则为安全起见跳过注入（避免跨查询污染）
    if (!Array.isArray(aliases)) return false;
    return aliases.some((a: any) => a?.name === aliasName);
  }

  private static isMainAliasMatched<T>(
    qb: SelectQueryBuilder<T>,
    config: DataPermissionConfig
  ): boolean {
    const mainAliasName = (qb as any)?.expressionMap?.mainAlias?.name;
    if (!mainAliasName) return false;

    const deptAlias = config.deptAlias?.trim();
    const userAlias = config.userAlias?.trim();

    // 如果配置了别名，则要求本次查询的主表别名命中其中之一
    if (deptAlias || userAlias) {
      return mainAliasName === deptAlias || mainAliasName === userAlias;
    }

    return true;
  }

  /** 应用数据权限过滤 */
  static applyDataPermission<T>(
    qb: SelectQueryBuilder<T>,
    config: DataPermissionConfig | null
  ): void {
    if (!config) return;

    // 必须显式指定别名，否则不注入
    if (!config.deptAlias?.trim() && !config.userAlias?.trim()) {
      return;
    }

    if (!this.isMainAliasMatched(qb, config)) {
      return;
    }

    if (!this.hasAlias(qb, config.deptAlias) || !this.hasAlias(qb, config.userAlias)) {
      return;
    }

    const userId = RequestContext.getUserId();
    if (!userId) return;

    // 超管跳过
    if (RequestContext.isRoot()) return;

    const dataScopes = RequestContext.getDataScopes();
    // 无权限则返回空结果
    if (!dataScopes || dataScopes.length === 0) {
      qb.andWhere("1 = 0");
      return;
    }

    // 任一角色有全部数据权限则跳过
    if (DataScopeUtils.hasAllDataScope(dataScopes)) return;

    const whereExpression = this.buildUnionExpression(qb, config, dataScopes);

    if (whereExpression) {
      qb.andWhere(whereExpression.expression, whereExpression.parameters);
    } else {
      qb.andWhere("1 = 0");
    }
  }

  /** 构建多角色并集条件 */
  private static buildUnionExpression<T>(
    qb: SelectQueryBuilder<T>,
    config: DataPermissionConfig,
    dataScopes: RoleDataScope[]
  ): { expression: string; parameters: Record<string, any> } | null {
    const expressions: string[] = [];
    const parameters: Record<string, any> = {};

    for (const dataScope of dataScopes) {
      const result = this.buildRoleDataScopeExpression(qb, config, dataScope);
      if (result) {
        expressions.push(result.expression);
        Object.assign(parameters, result.parameters);
      }
    }

    if (expressions.length === 0) return null;

    // OR连接各角色条件
    const unionExpression = expressions.map((expr) => `(${expr})`).join(" OR ");

    return { expression: `(${unionExpression})`, parameters };
  }

  /** 构建单角色数据权限条件 */
  private static buildRoleDataScopeExpression<T>(
    qb: SelectQueryBuilder<T>,
    config: DataPermissionConfig,
    dataScope: RoleDataScope
  ): { expression: string; parameters: Record<string, any> } | null {
    const { deptAlias, deptIdColumnName, userAlias, userIdColumnName } = config;

    const deptColumn = deptAlias ? `${deptAlias}.${deptIdColumnName}` : deptIdColumnName;
    const userColumn = userAlias ? `${userAlias}.${userIdColumnName}` : userIdColumnName;

    const paramSuffix = `_${dataScope.roleCode}_${Date.now()}`;
    const userId = RequestContext.getUserId();
    const deptId = RequestContext.getDeptId();

    switch (dataScope.dataScope) {
      case DataScopeEnum.ALL:
        return null;

      case DataScopeEnum.DEPT_AND_SUB:
        // 本部门及子部门
        if (deptId) {
          const deptIdParam = `deptId${paramSuffix}`;
          return {
            expression: `${deptColumn} IN (SELECT id FROM sys_dept WHERE id = :${deptIdParam} OR FIND_IN_SET(:${deptIdParam}, tree_path))`,
            parameters: { [deptIdParam]: deptId },
          };
        }
        return null;

      case DataScopeEnum.DEPT:
        // 本部门
        if (deptId) {
          const deptIdParam = `deptId${paramSuffix}`;
          return {
            expression: `${deptColumn} = :${deptIdParam}`,
            parameters: { [deptIdParam]: deptId },
          };
        }
        return null;

      case DataScopeEnum.SELF:
        // 仅本人
        if (userId) {
          const userIdParam = `userId${paramSuffix}`;
          return {
            expression: `${userColumn} = :${userIdParam}`,
            parameters: { [userIdParam]: userId },
          };
        }
        return null;

      case DataScopeEnum.CUSTOM:
        // 自定义部门
        if (dataScope.customDeptIds && dataScope.customDeptIds.length > 0) {
          const customDeptIdsParam = `customDeptIds${paramSuffix}`;
          return {
            expression: `${deptColumn} IN (:...${customDeptIdsParam})`,
            parameters: { [customDeptIdsParam]: dataScope.customDeptIds },
          };
        }
        return { expression: "1 = 0", parameters: {} };

      default:
        return null;
    }
  }
}

/**
 * 初始化数据权限插件
 * 拦截 QueryBuilder 的 getMany/getOne 方法，自动注入权限条件
 */
export function initDataPermissionPlugin(): void {
  const originalGetMany = (SelectQueryBuilder as any).prototype.getMany;
  const originalGetOne = (SelectQueryBuilder as any).prototype.getOne;
  const originalGetManyAndCount = (SelectQueryBuilder as any).prototype.getManyAndCount;
  const originalGetCount = (SelectQueryBuilder as any).prototype.getCount;

  (SelectQueryBuilder as any).prototype.getMany = function <T>(
    this: SelectQueryBuilder<T>
  ): Promise<T[]> {
    const config = RequestContext.getDataPermissionConfig();
    if (config) {
      DataPermissionHandler.applyDataPermission(this, config);
    }
    return originalGetMany.apply(this, arguments);
  };

  (SelectQueryBuilder as any).prototype.getOne = function <T>(
    this: SelectQueryBuilder<T>
  ): Promise<T | undefined> {
    const config = RequestContext.getDataPermissionConfig();
    if (config) {
      DataPermissionHandler.applyDataPermission(this, config);
    }
    return originalGetOne.apply(this, arguments);
  };

  (SelectQueryBuilder as any).prototype.getManyAndCount = function <T>(
    this: SelectQueryBuilder<T>
  ): Promise<[T[], number]> {
    const config = RequestContext.getDataPermissionConfig();
    if (config) {
      DataPermissionHandler.applyDataPermission(this, config);
    }
    return originalGetManyAndCount.apply(this, arguments);
  };

  (SelectQueryBuilder as any).prototype.getCount = function <T>(
    this: SelectQueryBuilder<T>
  ): Promise<number> {
    const config = RequestContext.getDataPermissionConfig();
    if (config) {
      DataPermissionHandler.applyDataPermission(this, config);
    }
    return originalGetCount.apply(this, arguments);
  };
}
