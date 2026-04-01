export type DateFormatOptions = {
  /** 格式模式，当前支持 'yyyy-MM-dd HH:mm:ss' */
  format?: string;
  /** IANA 时区标识，如 'Asia/Shanghai' */
  timeZone?: string;
};

export function formatDateToString(date: Date, opts?: DateFormatOptions): string | null {
  if (!(date instanceof Date)) return null;
  const timeZone = opts?.timeZone || "Asia/Shanghai";

  // 使用 Intl.DateTimeFormat 获取指定时区的各时间部分，再拼接为字符串
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  // 返回常见格式 'yyyy-MM-dd HH:mm:ss'
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function isPlainObject(value: any): boolean {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function transformDatesInObject<T>(obj: T, opts?: DateFormatOptions): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return formatDateToString(obj, opts) as unknown as T;
  }

  if (typeof obj === "bigint") {
    return obj.toString() as unknown as T;
  }

  if (typeof obj === "number") {
    if (!Number.isSafeInteger(obj)) {
      return obj.toString() as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformDatesInObject(item, opts)) as unknown as T;
  }

  if (isPlainObject(obj)) {
    const res: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      // Date -> 格式化字符串
      if (val instanceof Date) {
        res[key] = formatDateToString(val, opts);
        continue;
      }

      // BigInt -> 字符串
      if (typeof val === "bigint") {
        res[key] = val.toString();
        continue;
      }

      // 超出安全整数范围的 Number -> 字符串
      if (typeof val === "number" && !Number.isSafeInteger(val)) {
        res[key] = val.toString();
        continue;
      }

      // 嵌套数组 / 对象 -> 递归处理
      if (Array.isArray(val) || isPlainObject(val)) {
        res[key] = transformDatesInObject(val, opts);
        continue;
      }

      // 其他类型直接透传
      res[key] = val;
    }
    return res;
  }

  return obj;
}
