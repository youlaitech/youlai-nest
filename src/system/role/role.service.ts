import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { Model, Schema } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Role } from "./role.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import { UpdateMenuDto } from "../menu/dto/update-menu.dto";
import { MenuService } from "../menu/menu.service";
import { ROOT_ROLE_CODE } from "../../common/constants";

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name)
    private roleModel: Model<Role>,
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService
  ) {}

  /**
   * 角色分页列表
   *
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @param keywords 关键字
   * @returns
   */
  async getRolePage(pageNum, pageSize, keywords) {
    const filter = {};
    if (keywords) {
      const regex = new RegExp(keywords, "i");
      filter["name"] = { $regex: regex };
    }
    const data = await this.roleModel
      .find({ ...filter })
      .sort({ sort: "asc" })
      .skip((pageNum - 1) * pageSize) // 跳过前 (pageNum - 1) * pageSize 条数据
      .limit(pageSize) // 限制每页的数据数量
      .exec();
    const total = await this.roleModel.countDocuments({ filter }).exec();

    return { list: data, total };
  }

  /**
   * 根据角色查询菜单
   *
   * @param roleIds 角色ID集合
   * @returns
   */
  async getMenuIdsByRoleIds(roleIds: Schema.Types.ObjectId[]): Promise<string[]> {
    if (!roleIds?.length) return [];

    // 超级管理员角色，返回全部菜单权限
    /* if (roles.includes(ROOT_ROLE_CODE)) {
      return {
        permIds: (await this.menuService.findAll()).map((item) => item.id),
      };
    } */
    // 根据角色查询菜单权限
    const menuIds = (
      await this.roleModel
        .find({
          _id: { $in: roleIds },
          isDeleted: 0,
        })
        .lean()
    ).flatMap((role) => role.menuIds || []);

    // 去重菜单权限
    return [...new Set(menuIds)];
  }

  /**
   * 根据角色编码查询权限标识集合
   *
   * @param roles  角色编码集合
   * @returns 权限标识集合
   */
  async findPermsByRoleCodes(roles: string[]): Promise<string[]> {
    const menuIds = await this.roleModel.distinct("menuIds", { code: { $in: roles } }).exec();
    return await this.menuService.findPermsByMenuIds(menuIds);
  }

  /**
   * 角色下拉列表
   *
   * @returns 角色下拉列表 { label: string, value: string }[]
   */
  async getRoleOptions() {
    return this.roleModel
      .find({}, "name _id")
      .sort({ sort: "asc" })
      .lean()
      .exec()
      .then((results) =>
        results
          .filter(({ name }) => !!name?.trim())
          .map(({ name, _id }) => ({
            label: name,
            value: _id.toString(),
          }))
      );
  }

  /**
   * 创建角色
   */
  async create(createRoleDto: CreateRoleDto) {
    const name = createRoleDto.name;
    const existRole = await this.roleModel.find({ name });
    if (existRole.length > 0) {
      throw new BusinessException("角色已存在");
    }

    const newRoleModel = new this.roleModel({
      ...createRoleDto,
    });
    const newRole = await newRoleModel.save();
    return newRole;
  }

  /**
   * 根据 ID 查询角色
   *
   * @param id  角色 ID
   * @returns
   */
  async findOne(id: string) {
    const role = await this.roleModel.findById(id).lean().exec();
    return role;
  }

  /**
   * 更新角色
   */
  async update(id: string, updateMenuDto: UpdateMenuDto) {
    return await this.roleModel.findByIdAndUpdate(id, updateMenuDto, { new: true }).exec();
  }

  /**
   * 更新角色菜单
   */
  async updateMenus(id: string, menus: []) {
    return await this.roleModel.findByIdAndUpdate(id, { menus: menus }, { new: true }).exec();
  }

  async remove(id: string) {
    return await this.roleModel.findByIdAndDelete(id).exec();
  }

  /**
   * 查询角色编码集合
   *
   * @param roleIds 角色ID集合
   * @returns
   */
  async findCodesByIds(roleIds: Schema.Types.ObjectId[]): Promise<string[]> {
    const roles = await this.roleModel
      .find({ _id: { $in: roleIds } })
      .select("code -_id")
      .exec();

    return roles.map((r) => r.code);
  }
}
