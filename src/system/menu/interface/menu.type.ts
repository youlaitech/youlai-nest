// MenuItem 接口
export interface MenuItem {
  parentId: string;
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
