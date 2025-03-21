import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Menus } from "./menu.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import { UserService } from "../user/user.service";
import { typeMap, MenuItem, Route } from "./interface/menu.type";

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menus.name) // 使用 @InjectModel 注入 Mongoose 模型
    private menuModel: Model<Menus>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async findAll() {
    return await this.menuModel
      .find({ type: { $ne: 3 }, isDeleted: 0 })
      .sort({ sort: "asc" })
      .exec();
  }
  async find(menuIds: any) {
    return await this.menuModel
      .find({ _id: { $in: menuIds } })
      .sort({ sort: "asc" })
      .exec();
  }
  async findALLButtons() {
    const permslist: any = await this.menuModel
      .find({ type: 3 })
      .sort({ sort: "asc" })
      .lean()
      .exec();
    const perms: string[] = [];
    permslist.map((item: any) => {
      perms.push(item.perm);
    });
    return perms;
  }
  async findButtons(menuIds: string[]) {
    const permslist: any = await this.menuModel
      .find({ _id: { $in: menuIds }, type: 3 })
      .sort({ sort: "asc" })
      .lean()
      .exec();
    const perms: string[] = [];
    permslist.map((item: any) => {
      perms.push(item.perm);
    });
    return perms;
  }
  async findRoutes(menuIds: string[]) {
    const res: any = await this.menuModel
      .find({ _id: { $in: menuIds }, type: { $ne: 3 } })
      .sort({ sort: "asc" })
      .exec();
    // 添加日志
    console.log("res", res);

    return this.buildRoutes(res);
  }
  async findPermsList(filter) {
    return await this.menuModel.find(filter);
  }

  async findRouteIDs(id: string): Promise<any> {
    const permIds: string[] = await this.userService.getUserPerms(id);
    return permIds;
  }

  /**
   * 获取菜单树形表格列表
   *
   * @param keyword
   * @returns
   */
  async getMenus(keyword: string) {
    const regex = new RegExp(keyword, "i");
    let query = {};
    if (keyword) {
      query = { name: { $regex: regex } };
    }
    const menus = await this.menuModel.find(query).sort({ sort: "asc" }).lean().exec();

    console.log("menus", menus);
    return this.buildMenuTree(menus);
  }

  async findOptions() {
    try {
      const Options = await this.menuModel
        .find({}, { name: 1, parentId: 1, _id: 1 })
        .sort({ sort: "asc" })
        .lean()
        .exec();
      return this.buildOptionsTree(Options);
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async create(createMenuDto: CreateMenuDto) {
    const createdMenu = new this.menuModel({
      ...createMenuDto,
      createTime: Math.floor(Date.now() / 1000),
    });
    await createdMenu.save();
    return true;
  }

  /**
   * 获取菜单表单
   *
   * @param id  菜单ID
   * @returns
   */
  async getMenuForm(id: string) {
    return await this.menuModel.findById(id).lean().exec();
  }

  /**
   * 更新菜单
   *
   * @param id
   * @param updateMenuDto
   * @returns
   */
  async update(id: string, updateMenuDto: UpdateMenuDto) {
    return await this.menuModel.findByIdAndUpdate(id, updateMenuDto, { new: true }).exec();
  }

  /**
   * 删除菜单
   *
   * @param id
   * @returns
   */
  async deleteMenu(id: string) {
    return await this.menuModel.findByIdAndDelete(id).exec();
  }

  /**
   * 菜单树形数据处理
   *
   * @param menuList
   * @returns
   */
  private buildMenuTree(menuList: any[]): any[] {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    // 为每个菜单项创建一个映射
    menuList.forEach((menu) => {
      // 复制对象并初始化children为数组
      map[menu._id] = {
        ...menu,
        children: [],
        type: typeMap.get(menu.type),
        id: menu._id,
      };
    });

    // 组装树结构
    menuList.forEach((menu) => {
      // 如果菜单项没有parentId或者parentId为0，视为根节点
      if (menu.parentId === 0 || !map[menu.parentId]) {
        roots.push(map[menu._id]);
      } else {
        // 如果有parentId，则将其添加到父菜单的children中
        if (map[menu.parentId]) {
          map[menu.parentId].children.push(map[menu._id]);
        }
      }
    });

    return roots;
  }

  /**
   * 构建菜单树形下拉选项
   *
   * @param menus
   * @returns
   */
  private buildOptionsTree(menus: any[]): any[] {
    const map = new Map<string, any>();
    const roots: any[] = [];

    // 为每个菜单项创建一个 Map，并初始化 children
    menus.forEach((menu) => {
      map.set(menu._id.toString(), {
        label: menu.name,
        value: menu._id,
        children: [],
      });
    });

    // 遍历菜单项，根据 parentId 构建树形结构
    menus.forEach((menu) => {
      if (menu.parentId && map.has(menu.parentId.toString())) {
        map.get(menu.parentId.toString()).children.push(map.get(menu._id.toString()));
      } else {
        roots.push(map.get(menu._id.toString()));
      }
    });

    return roots;
  }

  /**
   * 构建菜单路由
   *
   * @param data 菜单数据
   * @param parentId 父菜单ID
   * @returns
   */
  private buildRoutes(data: MenuItem[], parentId: string | number = 0): Route[] {
    return data
      .filter((item) => item.parentId === parentId)
      .map((item) => {
        const route: Route = {
          path: item.routePath,
          component: item.component || "Layout",
          name: item.routeName || item.name,
          meta: {
            title: item.name,
            icon: item.icon || "el-icon-ElementPlus",
            hidden: item.visible === 0,
            alwaysShow: item.alwaysShow === 1,
            keepAlive: item.keepAlive === 1,
            params:
              item.params && item.params.length > 0
                ? Object.fromEntries(item.params.map((param) => [param.key, param.value]))
                : null,
          },
          children: this.buildRoutes(data, item.id),
        };

        if (route.children && route.children.length === 0) {
          delete route.children;
        }

        return route;
      });
  }
}
