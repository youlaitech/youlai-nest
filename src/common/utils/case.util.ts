/**
 * 驼峰或下划线命名转短横线小写，如 MenuDemo → menu-demo、menu_demo → menu-demo。
 * 权限标识、菜单路由路径与代码输出目录共用这一个实现，避免各处自拼后发散。
 */
export function toKebabCase(s: string): string {
  return String(s ?? "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s-]+/g, "-")
    .toLowerCase();
}

/** 短横线命名转英文复数，如 dict-item → dict-items、category → categories。 */
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
