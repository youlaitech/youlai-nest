import { SetMetadata } from "@nestjs/common";

export const DATA_PERMISSION_KEY = "data_permission";

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

/** 数据权限装饰器 */
export function DataPermission(config?: DataPermissionConfig): MethodDecorator & ClassDecorator {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ) => {
    const finalConfig: DataPermissionConfig = {
      deptAlias: config?.deptAlias,
      deptIdColumnName: config?.deptIdColumnName ?? "dept_id",
      userAlias: config?.userAlias,
      userIdColumnName: config?.userIdColumnName ?? "create_by",
    };

    if (descriptor) {
      SetMetadata(DATA_PERMISSION_KEY, finalConfig)(target, propertyKey, descriptor);
    } else {
      SetMetadata(DATA_PERMISSION_KEY, finalConfig)(target);
    }
  };
}

export const SKIP_DATA_PERMISSION_KEY = "skip_data_permission";

/** 跳过数据权限装饰器 */
export function SkipDataPermission(): MethodDecorator {
  return SetMetadata(SKIP_DATA_PERMISSION_KEY, true);
}
