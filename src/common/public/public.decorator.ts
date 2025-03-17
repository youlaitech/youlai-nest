import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Permissions = (...permissions: string[]) => SetMetadata("permissions", permissions);

// 统一创建数据
export const IsCreateBy = () => SetMetadata("createBy", true);
// 统一修改数据
export const IsUpdateBy = () => SetMetadata("updateBy", true);
