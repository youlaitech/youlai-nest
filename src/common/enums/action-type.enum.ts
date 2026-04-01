/**
 * 操作类型枚举值
 */
export enum ActionTypeValue {
  LOGIN = 1,
  LOGOUT = 2,
  INSERT = 3,
  UPDATE = 4,
  DELETE = 5,
  GRANT = 6,
  EXPORT = 7,
  IMPORT = 8,
  UPLOAD = 9,
  DOWNLOAD = 10,
  CHANGE_PASSWORD = 11,
  RESET_PASSWORD = 12,
  ENABLE = 13,
  DISABLE = 14,
  LIST = 15,
  OTHER = 99,
}

/**
 * 操作类型枚举类（支持自动序列化为 label）
 */
export class ActionTypeEnum {
  private static readonly _instances = new Map<ActionTypeValue, ActionTypeEnum>();

  static readonly LOGIN = new ActionTypeEnum(ActionTypeValue.LOGIN, "登录");
  static readonly LOGOUT = new ActionTypeEnum(ActionTypeValue.LOGOUT, "登出");
  static readonly INSERT = new ActionTypeEnum(ActionTypeValue.INSERT, "新增");
  static readonly UPDATE = new ActionTypeEnum(ActionTypeValue.UPDATE, "修改");
  static readonly DELETE = new ActionTypeEnum(ActionTypeValue.DELETE, "删除");
  static readonly GRANT = new ActionTypeEnum(ActionTypeValue.GRANT, "授权");
  static readonly EXPORT = new ActionTypeEnum(ActionTypeValue.EXPORT, "导出");
  static readonly IMPORT = new ActionTypeEnum(ActionTypeValue.IMPORT, "导入");
  static readonly UPLOAD = new ActionTypeEnum(ActionTypeValue.UPLOAD, "上传");
  static readonly DOWNLOAD = new ActionTypeEnum(ActionTypeValue.DOWNLOAD, "下载");
  static readonly CHANGE_PASSWORD = new ActionTypeEnum(ActionTypeValue.CHANGE_PASSWORD, "修改密码");
  static readonly RESET_PASSWORD = new ActionTypeEnum(ActionTypeValue.RESET_PASSWORD, "重置密码");
  static readonly ENABLE = new ActionTypeEnum(ActionTypeValue.ENABLE, "启用");
  static readonly DISABLE = new ActionTypeEnum(ActionTypeValue.DISABLE, "禁用");
  static readonly LIST = new ActionTypeEnum(ActionTypeValue.LIST, "查询列表");
  static readonly OTHER = new ActionTypeEnum(ActionTypeValue.OTHER, "其他");

  private constructor(
    public readonly value: ActionTypeValue,
    public readonly label: string
  ) {
    ActionTypeEnum._instances.set(value, this);
  }

  /** 从数值获取枚举实例 */
  static fromValue(value: number): ActionTypeEnum | undefined {
    return ActionTypeEnum._instances.get(value as ActionTypeValue);
  }

  /** 获取 label，若不存在返回"其他" */
  static getLabel(value: number): string {
    return ActionTypeEnum.fromValue(value)?.label ?? "其他";
  }

  /** JSON 序列化为 label */
  toJSON(): string {
    return this.label;
  }

  /** 字符串表示 */
  toString(): string {
    return this.label;
  }
}
