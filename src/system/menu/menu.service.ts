import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not } from "typeorm";
import { SysMenu } from "./entities/sys-menu.entity";
import { UserService } from "../user/user.service";
import { MenuItem, Route } from "./interface/menu.type";

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
      where: { type: Not(3), isDeleted: 0 },
      order: { sort: "ASC" },
    });
  }

  async find(menuIds: number[]) {
    return await this.menuRepository.find({
      where: { id: In(menuIds) },
      order: { sort: "ASC" },
    });
  }

  async findALLButtons(): Promise<string[]> {
    const buttons = await this.menuRepository.find({
      where: { type: 4, isDeleted: 0 },
      select: ["perm"],
    });

    return Array.from(
      new Set(buttons.map((menu) => menu.perm?.trim()).filter((perm): perm is string => !!perm))
    );
  }

  async findButtons(menuIds: string[]) {
    const permslist = await this.menuRepository.find({
      where: { id: In(menuIds.map(Number)), type: 3 },
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
      where: { id: In(menuIds.map(Number)), type: 4 },
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
      const menuList = await this.menuRepository.find({
        where: { type: In([1, 2]), visible: 1, isDeleted: 0 },
        order: { sort: "ASC" },
      });
      return this.buildRoutes(menuList);
    }

    // 其他用户返回其角色对应的菜单
    const menuIds = await this.userService.getUserMenuIds(Number(userId));
    if (!menuIds || menuIds.length === 0) {
      return [];
    }

    const menuList = await this.menuRepository.find({
      where: { id: In(menuIds), type: In([1, 2]), visible: 1, isDeleted: 0 },
      order: { sort: "ASC" },
    });
    return this.buildRoutes(menuList);
  }

  /**
   * 获取菜单树形表格列表
   */
  async getMenus(keyword: string) {
    const queryBuilder = this.menuRepository.createQueryBuilder("menu");
    queryBuilder.where("menu.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keyword) {
      queryBuilder.andWhere("menu.name LIKE :keyword", { keyword: `%${keyword}%` });
    }

    queryBuilder.orderBy("menu.sort", "ASC");
    const menus = await queryBuilder.getMany();

    return this.buildMenuTree(menus);
  }

  /**
   * 获取菜单下拉树形列表
   */
  async findOptions() {
    const menus = await this.menuRepository.find({
      select: ["id", "name", "parentId"],
      where: { isDeleted: 0 },
      order: { sort: "ASC" },
    });
    return this.buildOptionsTree(menus);
  }

  /**
   * 创建菜单
   */
  async create(createMenuDto: CreateMenuDto) {
    const menu = this.menuRepository.create({
      ...createMenuDto,
      parentId: createMenuDto.parentId ? Number(createMenuDto.parentId) : 0,
      createTime: new Date(),
    });
    await this.menuRepository.save(menu);
    return true;
  }

  /**
   * 获取菜单表单
   */
  async getMenuForm(id: number) {
    return await this.menuRepository.findOne({
      where: { id, isDeleted: 0 },
    });
  }

  /**
   * 更新菜单
   */
  async update(id: number, updateMenuDto: UpdateMenuDto) {
    const menu = await this.menuRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!menu) {
      return null;
    }

    const updatedMenu = {
      ...updateMenuDto,
      parentId: updateMenuDto.parentId ? Number(updateMenuDto.parentId) : 0,
      updateTime: new Date(),
    };

    return await this.menuRepository.update(id, updatedMenu);
  }

  /**
   * 删除菜单
   */
  async deleteMenu(id: number) {
    return await this.menuRepository.update(id, { isDeleted: 1 });
  }

  /**
   * 菜单树形数据处理
   */
  private buildMenuTree(menuList: SysMenu[]): any[] {
    const map: { [key: number]: any } = {};
    const roots: any[] = [];

    menuList.forEach((menu) => {
      map[menu.id] = {
        ...menu,
        children: [],
      };
    });

    menuList.forEach((menu) => {
      if (!menu.parentId || menu.parentId === 0) {
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
    const map: { [key: number]: any } = {};
    const roots: any[] = [];

    menus.forEach((menu) => {
      map[menu.id] = {
        value: menu.id,
        label: menu.name,
        children: [],
      };
    });

    menus.forEach((menu) => {
      if (!menu.parentId || menu.parentId === 0) {
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
  private buildRoutes(menus: SysMenu[], parentId: number = 0): Route[] {
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
            params: menu.params ? JSON.parse(menu.params) : {},
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
}
