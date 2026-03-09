import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { SysMenu } from "./entities/sys-menu.entity";
import { UserService } from "../user/user.service";
import { Route } from "./interface/menu.type";

/**
 * 菜单服务
 */
@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(SysMenu)
    private menuRepository: Repository<SysMenu>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
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
        where: { type: In(["C", "M"]) },
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
      where: { id: In(menuIds.map((id) => id.toString())), type: In(["C", "M"]) },
      order: { sort: "ASC" },
    });
    return this.buildRoutes(menuList);
  }

  /**
   * 获取菜单树形表格列表
   */
  async getMenus(keyword: string) {
    const queryBuilder = this.menuRepository.createQueryBuilder("menu");

    // 如果有关键字，先找出所有匹配的菜单
    let matchedMenus: SysMenu[] = [];
    if (keyword) {
      matchedMenus = await this.menuRepository
        .createQueryBuilder("menu")
        .where("menu.name LIKE :keyword", { keyword: `%${keyword}%` })
        .orderBy("menu.sort", "ASC")
        .getMany();
    } else {
      // 没有关键字时返回所有菜单
      matchedMenus = await this.menuRepository
        .createQueryBuilder("menu")
        .orderBy("menu.sort", "ASC")
        .getMany();
      return this.buildMenuTree(matchedMenus);
    }

    if (matchedMenus.length === 0) {
      return [];
    }

    // 收集所有匹配菜单的父级ID
    const allMenuIds = new Set<string>();
    matchedMenus.forEach((menu) => {
      allMenuIds.add(menu.id);
      // 解析 treePath 获取所有父级ID
      if (menu.treePath) {
        const parentIds = menu.treePath.split(",").filter(Boolean);
        parentIds.forEach((id) => allMenuIds.add(id));
      }
    });

    // 查询所有需要的菜单（匹配的菜单 + 其父级菜单）
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

    // 判断是否为外链菜单
    const isExternalLink =
      type === "M" && (routePath?.startsWith("http://") || routePath?.startsWith("https://"));

    // 目录类型处理
    let component = createMenuDto.component;
    if (type === "C") {
      // 一级目录需以 / 开头
      if ((!parentId || parentId === "0") && routePath && !routePath.startsWith("/")) {
        createMenuDto.routePath = "/" + routePath;
      }
      component = "Layout";
    } else if (isExternalLink) {
      // 外链菜单组件设为 null
      component = null;
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
    return await this.menuRepository.findOne({
      where: { id: id.toString() },
    });
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

    // 判断是否为外链菜单
    const isExternalLink =
      type === "M" && (routePath?.startsWith("http://") || routePath?.startsWith("https://"));

    // 目录类型处理
    let component = updateMenuDto.component ?? menu.component;
    if (type === "C") {
      // 一级目录需以 / 开头
      if ((!parentId || parentId === "0") && routePath && !routePath.startsWith("/")) {
        updateMenuDto.routePath = "/" + routePath;
      }
      component = "Layout";
    } else if (isExternalLink) {
      component = null;
    }

    // 检查父级不能为自己
    if (parentId === idStr) {
      throw new Error("父级菜单不能为当前菜单");
    }

    // 处理 parentId
    const newParentId = parentId || "0";

    // 重新计算 treePath（如果父级变化）
    let newTreePath = menu.treePath;
    if (newParentId !== menu.parentId) {
      newTreePath = await this.generateMenuTreePath(newParentId);
    }

    const updatedMenu = {
      ...updateMenuDto,
      component,
      parentId: newParentId,
      treePath: newTreePath,
      updateTime: new Date(),
    };

    await this.menuRepository.update(idStr, updatedMenu as any);

    // 更新子菜单的 treePath
    if (newParentId !== menu.parentId) {
      await this.updateChildrenTreePath(idStr, newTreePath);
    }

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

    return true;
  }

  /**
   * 菜单树形数据处理
   */
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
        const route: Route = {
          path: menu.routePath || "",
          component: menu.component || "",
          name: menu.routeName || "",
          meta: {
            title: menu.name,
            icon: menu.icon || "",
            hidden: menu.visible === 0,
            keepAlive: menu.keepAlive === 1,
            alwaysShow: menu.alwaysShow === 1,
            params: this.parseMenuParams(menu.params),
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
}
