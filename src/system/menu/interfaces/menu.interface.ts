// MenuItem 接口
export interface MenuItem {
  parentId: string;
  name: string;
  type: string;
  routeName: string | null;
  routePath: string;
  component: string | null;
  externalUrl: string | null;
  keepAlive: number;
  visible: number;
  icon: string;
  redirect: string | null;
  params: { key: string; value: string }[];
  id: string;
}

// AI 推断的菜单配置
export interface MenuAiFillResult {
  routePath: string | null;
  perm: string | null;
  iconKeywords: string[];
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
    keepAlive: boolean;
    params: Record<string, string> | null;
    externalUrl: string;
  };
  children?: Route[];
}
