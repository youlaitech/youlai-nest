import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not } from "typeorm";
import { SysMenu } from "./entities/sys-menu.entity";
import { UserService } from "../user/user.service";
import { RolePermService } from "../role/role-permission.service";
import { Route } from "./interfaces/menu.interface";

/**
 * 菜单服务
 */
@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(SysMenu)
    private menuRepository: Repository<SysMenu>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => RolePermService))
    private readonly rolePermService: RolePermService
  ) {}

  async findAll() {
    return await this.menuRepository.find({
      order: { sort: "ASC" },
    });
  }

  async find(menuIds: (number | string)[]) {
    const ids = menuIds.map((id) => id.toString());
    return await this.menuRepository.find({
      where: { id: In(ids) },
      order: { sort: "ASC" },
    });
  }

  /**
   * 获取所有按钮权限标识
   */
  async findALLButtons(): Promise<string[]> {
    const buttons = await this.menuRepository.find({
      where: { type: "B", visible: 1 },
      select: ["perm"],
    });

    return Array.from(
      new Set(buttons.map((menu) => menu.perm?.trim()).filter((perm): perm is string => !!perm))
    );
  }

  async findButtons(menuIds: string[]) {
    const permslist = await this.menuRepository.find({
      where: { id: In(menuIds.map((id) => id.toString())), type: "B" },
      order: { sort: "ASC" },
    });
    return permslist.map((item) => item.perm).filter(Boolean);
  }

  /**
   * 根据菜单ID查询权限集合
   */
  async findPermsByMenuIds(menuIds: string[]): Promise<string[]> {
    if (!menuIds?.length) return [];

    const menus = await this.menuRepository.find({
      where: { id: In(menuIds.map((id) => id.toString())), type: "B" },
      select: ["perm"],
    });

    return Array.from(
      new Set(menus.map((menu) => menu.perm?.trim()).filter((perm): perm is string => !!perm))
    );
  }

  /**
   * 获取用户菜单
   */
  async getRoutes(userId: string): Promise<Route[]> {
    // 超级管理员返回所有菜单
    if (userId === "1") {
      // 后端路由用于前端注册，不仅决定侧边栏显示；因此这里会包含 visible=0 的隐藏菜单
      const menuList = await this.menuRepository.find({
      where: { type: Not("B") },
      order: { sort: "ASC" },
    });
    return this.buildRoutes(menuList);
  }

    // 其他用户返回其角色对应的菜单
    const menuIds = await this.userService.getUserMenuIds(userId);
    if (!menuIds || menuIds.length === 0) {
      return [];
    }

    // 保持路由完整，防止路由未注册问题
    const menuList = await this.menuRepository.find({
      where: { id: In(menuIds.map((id) => id.toString())), type: Not("B") },
      order: { sort: "ASC" },
    });
    return this.buildRoutes(menuList);
  }

  /**
   * 获取菜单树形表格列表
   */
  async getMenus(keyword: string) {
    const queryBuilder = this.menuRepository.createQueryBuilder("menu");

    let matchedMenus: SysMenu[] = [];
    if (keyword) {
      matchedMenus = await this.menuRepository
        .createQueryBuilder("menu")
        .where("menu.name LIKE :keyword", { keyword: `%${keyword}%` })
        .orderBy("menu.sort", "ASC")
        .getMany();
    } else {
      matchedMenus = await this.menuRepository
        .createQueryBuilder("menu")
        .orderBy("menu.sort", "ASC")
        .getMany();
      return this.buildMenuTree(matchedMenus);
    }

    if (matchedMenus.length === 0) {
      return [];
    }

    const allMenuIds = new Set<string>();
    matchedMenus.forEach((menu) => {
      allMenuIds.add(menu.id);
      if (menu.treePath) {
        const parentIds = menu.treePath.split(",").filter(Boolean);
        parentIds.forEach((id) => allMenuIds.add(id));
      }
    });

    const allMenus = await this.menuRepository
      .createQueryBuilder("menu")
      .where("menu.id IN (:...ids)", { ids: Array.from(allMenuIds) })
      .orderBy("menu.sort", "ASC")
      .getMany();

    return this.buildMenuTree(allMenus);
  }

  /**
   * 获取菜单下拉树形列表
   */
  async findOptions() {
    const menus = await this.menuRepository.find({
      select: ["id", "name", "parentId"],
      order: { sort: "ASC" },
    });
    return this.buildOptionsTree(menus);
  }

  /**
   * 创建菜单
   */
  async create(createMenuDto: CreateMenuDto) {
    const { type, routePath, parentId } = createMenuDto;

    const isExternal = type === "E";
    const isEmbedded = isExternal && createMenuDto.component === "iframe";

    let component = createMenuDto.component;
    if (type === "C") {
      if ((!parentId || parentId === "0") && routePath && !routePath.startsWith("/")) {
        createMenuDto.routePath = "/" + routePath;
      }
      component = "Layout";
    } else if (isExternal && !isEmbedded) {
      component = null;
    }

    // 菜单(M)和内嵌外链(E+iframe)需要路由名称唯一
    const needsRouteName = type === "M" || isEmbedded;
    if (needsRouteName) {
      const existing = await this.menuRepository.findOne({
        where: { routeName: createMenuDto.routeName },
      });
      if (existing) {
        throw new Error("路由名称已存在");
      }
    } else {
      // C 类型（目录）、E 类型（外链非 iframe）不需要 routeName，清空
      createMenuDto.routeName = null;
    }

    // 生成 treePath
    const treePath = await this.generateMenuTreePath(parentId || "0");

    const menu = this.menuRepository.create({
      ...createMenuDto,
      component,
      parentId: parentId || "0",
      treePath,
      createTime: new Date(),
    });

    await this.menuRepository.save(menu);

    // 更新菜单 ID 到 treePath
    if (menu.parentId === "0") {
      menu.treePath = menu.id;
    } else {
      menu.treePath = `${treePath},${menu.id}`;
    }
    await this.menuRepository.save(menu);

    return true;
  }

  /**
   * 生成菜单树路径
   */
  private async generateMenuTreePath(parentId: string): Promise<string> {
    if (!parentId || parentId === "0") {
      return "0";
    }
    const parent = await this.menuRepository.findOne({
      where: { id: parentId },
      select: ["id", "treePath"],
    });
    if (!parent) {
      return "0";
    }
    return parent.treePath || "0";
  }

  /**
   * 获取菜单表单
   */
  async getMenuForm(id: string | number) {
    const menu = await this.menuRepository.findOne({
      where: { id: id.toString() },
    });
    if (!menu) return null;

    // params: {k: v} -> [{key: k, value: v}]
    const result: any = { ...menu };
    if (menu.params && typeof menu.params === "object") {
      result.params = Object.entries(menu.params).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    } else {
      result.params = null;
    }
    return result;
  }

  /**
   * 更新菜单
   */
  async update(id: string | number, updateMenuDto: UpdateMenuDto) {
    const idStr = id.toString();
    const menu = await this.menuRepository.findOne({ where: { id: idStr } });
    if (!menu) {
      return null;
    }

    const { type, routePath, parentId } = updateMenuDto;

    const isExternal = type === "E";
    const isEmbedded = isExternal && updateMenuDto.component === "iframe";

    let component = updateMenuDto.component ?? menu.component;
    if (type === "C") {
      if ((!parentId || parentId === "0") && routePath && !routePath.startsWith("/")) {
        updateMenuDto.routePath = "/" + routePath;
      }
      component = "Layout";
    } else if (isExternal && !isEmbedded) {
      component = null;
    }

    // 检查父级不能为自己
    if (parentId === idStr) {
      throw new Error("父级菜单不能为当前菜单");
    }

    const newParentId = parentId || "0";

    // 重新计算 treePath（如果父级变化）
    let newTreePath = menu.treePath;
    if (newParentId !== menu.parentId) {
      newTreePath = await this.generateMenuTreePath(newParentId);
    }

    // clearable 字段未传时置为 null
    const dto: Record<string, any> = { ...updateMenuDto };
    for (const field of ['icon', 'redirect', 'perm', 'externalUrl']) {
      if (dto[field] === undefined) dto[field] = null;
    }

    // 菜单(M)和内嵌外链(E+iframe)需要路由名称唯一
    const needsRouteName = type === "M" || isEmbedded;
    if (needsRouteName) {
      const existing = await this.menuRepository.findOne({
        where: { routeName: dto.routeName },
      });
      if (existing && existing.id !== idStr) {
        throw new Error("路由名称已存在");
      }
    } else {
      // C 类型（目录）、E 类型（外链非 iframe）不需要 routeName，强制清空
      dto.routeName = null;
    }

    dto.component = component;
    dto.parentId = newParentId;
    dto.treePath = newTreePath;
    dto.updateTime = new Date();

    await this.menuRepository.update(idStr, dto as any);

    // 更新子菜单的 treePath
    if (newParentId !== menu.parentId) {
      await this.updateChildrenTreePath(idStr, newTreePath);
    }

    // 刷新角色权限缓存
    await this.rolePermService.refreshAllRolePermsCache();

    return true;
  }

  /**
   * 更新子菜单树路径
   */
  private async updateChildrenTreePath(id: string, treePath: string): Promise<void> {
    const children = await this.menuRepository.find({
      where: { parentId: id },
    });

    if (children.length > 0) {
      const childTreePath = `${treePath},${id}`;
      for (const child of children) {
        await this.menuRepository.update(child.id, { treePath: childTreePath });
        await this.updateChildrenTreePath(child.id, childTreePath);
      }
    }
  }

  /**
   * 删除菜单（级联删除子菜单）
   */
  async deleteMenu(id: string | number) {
    const idStr = id.toString();

    // 查找所有子菜单（包括嵌套的）
    const allMenus = await this.menuRepository.find({
      select: ["id", "parentId", "treePath"],
    });

    const idsToDelete = new Set<string>([idStr]);

    // 递归查找子菜单
    const findChildren = (parentId: string) => {
      for (const menu of allMenus) {
        if (menu.parentId === parentId) {
          idsToDelete.add(menu.id);
          findChildren(menu.id);
        }
      }
    };
    findChildren(idStr);

    // 批量删除
    await this.menuRepository.delete(Array.from(idsToDelete));

    // 刷新角色权限缓存
    await this.rolePermService.refreshAllRolePermsCache();

    return true;
  }

  private buildMenuTree(menuList: SysMenu[]): any[] {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    menuList.forEach((menu) => {
      map[menu.id] = {
        ...menu,
        children: [],
      };
    });

    menuList.forEach((menu) => {
      if (!menu.parentId || menu.parentId === "0") {
        roots.push(map[menu.id]);
      } else {
        if (map[menu.parentId]) {
          map[menu.parentId].children.push(map[menu.id]);
        }
      }
    });

    return roots;
  }

  /**
   * 构建菜单选项树
   */
  private buildOptionsTree(menus: SysMenu[]): any[] {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    menus.forEach((menu) => {
      map[menu.id] = {
        value: menu.id,
        label: menu.name,
        children: [],
      };
    });

    menus.forEach((menu) => {
      if (!menu.parentId || menu.parentId === "0") {
        roots.push(map[menu.id]);
      } else {
        if (map[menu.parentId]) {
          map[menu.parentId].children.push(map[menu.id]);
        }
      }
    });

    return roots;
  }

  /**
   * 构建前端路由
   */
  private buildRoutes(menus: SysMenu[], parentId: string = "0"): Route[] {
    const routes: Route[] = [];

    menus.forEach((menu) => {
      if (menu.parentId === parentId) {
        const isExternal = menu.type === "E";
        const isEmbedded = isExternal && menu.component === "iframe";
        const routePath = isExternal && !isEmbedded && menu.externalUrl
          ? menu.externalUrl
          : (menu.routePath || "");

        const route: Route = {
          path: routePath,
          component: isEmbedded ? "iframe" : (isExternal ? null : menu.component || ""),
          name: isExternal ? (menu.routeName || "") : (menu.routeName || ""),
          meta: {
            title: menu.name,
            icon: menu.icon || "",
            hidden: menu.visible === 0,
            keepAlive: (menu.type === "M" || isEmbedded) ? menu.keepAlive === 1 : false,
            alwaysShow: menu.alwaysShow === 1,
            params: this.parseMenuParams(menu.params),
            externalUrl: isEmbedded && menu.externalUrl ? menu.externalUrl : "",
          },
          children: this.buildRoutes(menus, menu.id),
        };

        if (route.children.length === 0) {
          delete route.children;
        }

        routes.push(route);
      }
    });

    return routes;
  }

  private parseMenuParams(raw: any): Record<string, any> {
    if (!raw) return {};

    if (typeof raw === "object") {
      return raw as Record<string, any>;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    }

    return {};
  }

  /**
   * 代码生成菜单
   */
  async addMenuForCodegen(
    parentMenuId: number,
    tableName: string,
    moduleName: string,
    businessName: string,
    entityName: string
  ): Promise<void> {
    const parent = await this.menuRepository.findOne({ where: { id: parentMenuId.toString() } });
    if (!parent) {
      return;
    }

    // 计算同级最大排序号 +1
    let sort = 1;
    const maxSortMenu = await this.menuRepository.findOne({
      where: { parentId: parentMenuId.toString() },
      order: { sort: "DESC" },
    });
    if (maxSortMenu) {
      sort = maxSortMenu.sort + 1;
    }

    // 构建菜单实体
    const entityKebab = this.toKebabCase(entityName);
    const treePath = `${parent.treePath},${parentMenuId}`;

    // 创建菜单记录
    const menu = this.menuRepository.create({
      parentId: parentMenuId.toString(),
      type: "M",
      name: businessName,
      routeName: entityName,
      routePath: entityKebab,
      component: `${moduleName}/${entityKebab}/index`,
      sort,
      visible: 1,
      treePath,
      createTime: new Date(),
    });
    await this.menuRepository.save(menu);

    // 生成CURD按钮权限
    const permPrefix = `${moduleName}:${tableName.replace(/_/g, '-')}:`;
    const actions = ["查询", "新增", "修改", "删除"];
    const perms = ["list", "create", "update", "delete"];
    for (let i = 0; i < actions.length; i++) {
      const button = this.menuRepository.create({
        parentId: menu.id,
        type: "B",
        name: actions[i],
        perm: permPrefix + perms[i],
        sort: i + 1,
        treePath: `${treePath},${menu.id}`,
        createTime: new Date(),
      });
      await this.menuRepository.save(button);
    }
  }

  /**
   * 驼峰转换为kebab-case
   */
  private toKebabCase(s: string): string {
    if (!s) return "";
    let result = "";
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (i > 0 && c >= "A" && c <= "Z") {
        result += "-";
      }
      result += c.toLowerCase();
    }
    return result;
  }
}
