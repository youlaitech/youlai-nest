import { SelectQueryBuilder } from "typeorm";
import { RequestContext } from "../context/request-context";
import { DataScopeEnum } from "../enums/data-scope.enum";

/**
 * 全局数据权限补全插件
 *
 * 在 TypeORM QueryBuilder 执行 getMany/getOne 前，根据当前登录用户的数据范围
 * 自动追加对应的 WHERE 条件。
 */
export function applyDataScope<T>(qb: SelectQueryBuilder<T>): void {
  const ctx = RequestContext.getCurrentUser();
  if (!ctx) return;

  const { userId, deptId, dataScope } = ctx;
  if (!dataScope) return;

  const alias = qb.alias;

  switch (dataScope) {
    case DataScopeEnum.ALL:
      // 全部数据，不做限制
      return;
    case DataScopeEnum.CURRENT_DEPT:
      if (deptId) {
        qb.andWhere(`${alias}.dept_id = :__deptId`, { __deptId: deptId });
      }
      return;
    case DataScopeEnum.SELF:
      qb.andWhere(`${alias}.create_by = :__userId`, { __userId: userId });
      return;
    case DataScopeEnum.DEPT_TREE:
    default:
      if (deptId) {
        // 部门及子部门：依赖 sys_dept.tree_path 字段
        qb.andWhere(
          `${alias}.dept_id IN ( SELECT id FROM sys_dept WHERE id = :__deptId OR FIND_IN_SET(:__deptId, tree_path) )`,
          { __deptId: deptId }
        );
      }
      return;
  }
}

// --- 全局 patch TypeORM QueryBuilder ---

const oldGetMany = (SelectQueryBuilder as any).prototype.getMany;
(SelectQueryBuilder as any).prototype.getMany = function () {
  applyDataScope(this);
  return oldGetMany.apply(this, arguments);
};

const oldGetOne = (SelectQueryBuilder as any).prototype.getOne;
(SelectQueryBuilder as any).prototype.getOne = function () {
  applyDataScope(this);
  return oldGetOne.apply(this, arguments);
};
