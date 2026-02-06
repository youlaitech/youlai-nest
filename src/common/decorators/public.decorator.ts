import { SetMetadata } from "@nestjs/common";
import { METADATA } from "../constants/metadata.constant";

export const IS_PUBLIC_KEY = METADATA.PUBLIC;
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * 权限校验装饰器
 * @param permissions 权限标识列表
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(METADATA.PERMISSIONS, permissions);

// 统一创建数据
export const IsCreateBy = () => SetMetadata("createBy", true);
// 统一修改数据
export const IsUpdateBy = () => SetMetadata("updateBy", true);
