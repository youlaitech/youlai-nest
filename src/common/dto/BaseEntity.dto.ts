export class BaseEntityDto {
  readonly isDeleted?: number;
  readonly deptTreePath?: string;

  readonly createBy?: string;

  readonly updateBy?: string;

  readonly createTime?: number;

  readonly updateTime?: number;
}
