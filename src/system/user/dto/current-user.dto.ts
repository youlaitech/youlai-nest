export class CurrentUserDto {
  userId: string;

  username: string;

  nickname?: string;

  avatar?: string;

  mobile?: string;

  email?: string;

  roles: string[];

  perms: string[];
}
