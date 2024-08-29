import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('isPublic', true);

export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
// export const METADATA_NOT_CHECK = 'notCheck';
// export const NotCheck = () => SetMetadata(METADATA_NOT_CHECK, true);

// 统一创建数据
export const IsCreateBy = () => SetMetadata('createBy', true);
// 统一修改数据
export const IsUpdateBy = () => SetMetadata('updateBy', true);
