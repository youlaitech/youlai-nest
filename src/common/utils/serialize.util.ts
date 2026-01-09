export type DateFormatOptions = {
  format?: string; // currently supports 'yyyy-MM-dd HH:mm:ss' pattern
  timeZone?: string; // IANA time zone string like 'Asia/Shanghai'
};

export function formatDateToString(date: Date, opts?: DateFormatOptions): string | null {
  if (!(date instanceof Date)) return null;
  const timeZone = opts?.timeZone || "Asia/Shanghai";

  // Use Intl.DateTimeFormat to get parts in the requested timezone, then assemble
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

  // Currently we return the common pattern 'yyyy-MM-dd HH:mm:ss'
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function isPlainObject(value: any): boolean {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function transformDatesInObject<T>(obj: T, opts?: DateFormatOptions): T {
  if (obj == null) return obj;

  // Handle Date -> formatted string
  if (obj instanceof Date) {
    // @ts-ignore
    return formatDateToString(obj, opts) as any;
  }

  // Handle primitive bigint -> string
  if (typeof obj === "bigint") {
    // @ts-ignore
    return obj.toString() as any;
  }

  // Handle numbers that exceed JS safe integer range -> string
  if (typeof obj === "number") {
    if (!Number.isSafeInteger(obj)) {
      // @ts-ignore
      return obj.toString() as any;
    }
    // safe number, return as-is
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => transformDatesInObject(item, opts)) as any;
  }

  if (isPlainObject(obj)) {
    const res: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      // Date -> formatted string
      if (val instanceof Date) {
        res[key] = formatDateToString(val, opts);
        continue;
      }

      // BigInt -> string
      if (typeof val === "bigint") {
        res[key] = val.toString();
        continue;
      }

      // Number exceeding safe integer -> string
      if (typeof val === "number" && !Number.isSafeInteger(val)) {
        res[key] = val.toString();
        continue;
      }

      // Nested arrays / objects -> recurse
      if (Array.isArray(val) || isPlainObject(val)) {
        res[key] = transformDatesInObject(val, opts);
        continue;
      }

      // default passthrough
      res[key] = val;
    }
    return res;
  }

  return obj;
}


