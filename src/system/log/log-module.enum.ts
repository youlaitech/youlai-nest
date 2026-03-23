/**
 * 日志模块枚举值
 */
export enum LogModuleValue {
  LOGIN = 1,
  USER = 2,
  ROLE = 3,
  DEPT = 4,
  MENU = 5,
  DICT = 6,
  CONFIG = 7,
  FILE = 8,
  NOTICE = 9,
  LOG = 10,
  CODEGEN = 11,
  OTHER = 99,
}

/**
 * 日志模块枚举类（支持自动序列化为 label）
 */
export class LogModuleEnum {
  private static readonly _instances = new Map<LogModuleValue, LogModuleEnum>();

  static readonly LOGIN = new LogModuleEnum(LogModuleValue.LOGIN, "登录");
  static readonly USER = new LogModuleEnum(LogModuleValue.USER, "用户管理");
  static readonly ROLE = new LogModuleEnum(LogModuleValue.ROLE, "角色管理");
  static readonly DEPT = new LogModuleEnum(LogModuleValue.DEPT, "部门管理");
  static readonly MENU = new LogModuleEnum(LogModuleValue.MENU, "菜单管理");
  static readonly DICT = new LogModuleEnum(LogModuleValue.DICT, "字典管理");
  static readonly CONFIG = new LogModuleEnum(LogModuleValue.CONFIG, "系统配置");
  static readonly FILE = new LogModuleEnum(LogModuleValue.FILE, "文件管理");
  static readonly NOTICE = new LogModuleEnum(LogModuleValue.NOTICE, "通知公告");
  static readonly LOG = new LogModuleEnum(LogModuleValue.LOG, "日志管理");
  static readonly CODEGEN = new LogModuleEnum(LogModuleValue.CODEGEN, "代码生成");
  static readonly OTHER = new LogModuleEnum(LogModuleValue.OTHER, "其他");

  private constructor(
    public readonly value: LogModuleValue,
    public readonly label: string
  ) {
    LogModuleEnum._instances.set(value, this);
  }

  /** 从数值获取枚举实例 */
  static fromValue(value: number): LogModuleEnum | undefined {
    return LogModuleEnum._instances.get(value as LogModuleValue);
  }

  /** 获取 label，若不存在返回"其他" */
  static getLabel(value: number): string {
    return LogModuleEnum.fromValue(value)?.label ?? "其他";
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
