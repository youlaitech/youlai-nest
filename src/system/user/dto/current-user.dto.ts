/**
 * 当前登录用户信息
 */
export class CurrentUserDto {
  userId: string;

  username: string;

  nickname?: string;

  avatar?: string;

  mobile?: string;

  email?: string;

  gender?: number;

  deptId?: string;

  deptName?: string;

  roleNames?: string;

  createTime?: string;

  roles: string[];

  perms: string[];
}
