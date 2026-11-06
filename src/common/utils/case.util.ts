/**
 * 驼峰或下划线命名转短横线小写，如 MenuDemo → menu-demo
 */
export function toKebabCase(s: string): string {
  return String(s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s-]+/g, "-")
    .toLowerCase();
}

/**
 * 短横线命名转英文复数，如 dict-item → dict-items、category → categories
 */
export function toPluralKebab(s: string): string {
  const word = toKebabCase(s);
  if (/(s|x|z|ch|sh)$/.test(word)) {
    return word + "es";
  }
  if (/[^aeiou]y$/.test(word)) {
    return word.slice(0, -1) + "ies";
  }
  return word + "s";
}

/**
 * 下划线或短横线命名转小驼峰，如 sys_user → sysUser
 */
export function toCamelCase(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[_-](\w)/g, (_, c) => String(c).toUpperCase());
}

/**
 * 下划线或短横线命名转大驼峰，如 sys_user → SysUser
 */
export function toPascalCase(s: string): string {
  const c = toCamelCase(s);
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : c;
}

/**
 * 驼峰命名转大写下划线，如 SysUser → SYS_USER
 */
export function toSnakeUpper(s: string): string {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toUpperCase();
}

/**
 * 首字母转小写
 */
export function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}
