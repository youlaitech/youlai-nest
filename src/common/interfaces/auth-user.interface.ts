export interface AuthUser {
  userId: string;
  username: string;
  roles: string[];
  deptTreePath?: string;
}
