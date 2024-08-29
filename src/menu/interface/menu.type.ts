// types.ts

// 常量类型映射
export const typeMap: Map<any, any> = new Map([
  [1, 'CATALOG'],
  [2, 'MENU'],
  [3, 'BUTTON'],
  [4, 'EXTLINK'],
]);
export const typeMapValue: Map<any, any> = new Map([
  ['CATALOG', 1],
  ['MENU', 2],
  ['BUTTON', 3],
  ['EXTLINK', 4],
]);

// MenuItem 接口
export interface MenuItem {
  parentId: string | number;
  name: string;
  type: number;
  routeName: string | null;
  routePath: string;
  component: string | null;
  alwaysShow: number;
  keepAlive: number;
  visible: number;
  icon: string;
  redirect: string | null;
  params: { key: string; value: string }[];
  id: string;
}

// Route 接口
export interface Route {
  path: string;
  component: string;
  name: string;
  meta: {
    title: string;
    icon: string;
    hidden: boolean;
    alwaysShow: boolean;
    keepAlive: boolean;
    params: Record<string, string> | null;
  };
  children?: Route[];
}
