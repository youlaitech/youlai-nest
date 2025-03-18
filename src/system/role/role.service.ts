import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Role } from "./role.schema";
import { ApiException } from "../../common/http-exception/api.exception";
import { BusinessErrorCode } from "../../common/enums/business-error-code.enum";
import { UpdateMenuDto } from "../menu/dto/update-menu.dto";
import { matchDeptPath } from "../../common/shared/regex-utils";
import { MenuService } from "../menu/menu.service";
import { ROOT_ROLE_CODE } from "../../common/constants";

@Injectable()
export class RoleService {
  constructor(
    @InjectModel(Role.name)
    private rolesModel: Model<Role>,
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService
  ) {}

  /**
   * 分页查询角色
   *
   * @param pageNum 页码
   * @param pageSize 每页数量
   * @param keywords 关键字
   * @param deptTreePath 部门树路径
   * @returns
   */
  async findSearch(pageNum, pageSize, keywords, deptTreePath) {
    const filter = {};
    if (keywords) {
      const regex = new RegExp(keywords, "i");
      filter["name"] = { $regex: regex };
    }
    const data = await this.rolesModel
      .find({ ...filter, ...matchDeptPath(deptTreePath) })
      .sort({ sort: "asc" })
      .skip((pageNum - 1) * pageSize) // 跳过前 (pageNum - 1) * pageSize 条数据
      .limit(pageSize) // 限制每页的数据数量
      .exec();
    const total = await this.rolesModel.countDocuments({ filter }).exec();

    return { list: data, total };
  }

  /**
   * 根据角色查询菜单
   *
   * @param roles 角色编码集合
   * @returns
   */
  async findMenus(roles: string[]) {
    if (!roles?.length) return { permIds: [] };

    // 超级管理员角色，返回全部菜单权限
    if (roles.includes(ROOT_ROLE_CODE)) {
      return {
        permIds: (await this.menuService.findRouteAll()).map((item) => item.id),
      };
    }
    // 根据角色查询菜单权限
    const permIds = (
      await this.rolesModel
        .find({
          code: {
            $in: roles.filter((role) => !!role?.trim()),
          },
          isDeleted: 0,
        })
        .lean()
    ).flatMap((role) => role.menus || []);

    // 去重菜单权限
    return {
      permIds: [...new Set(permIds)],
    };
  }

  /**
   * 获取角色下拉列表
   *
   * @returns 角色下拉列表 { label: string, value: string }[]
   */
  async findOptions() {
    return this.rolesModel
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

  // 创建角色
  async create(createRoleDto: CreateRoleDto) {
    try {
      const name = createRoleDto.name;
      // 角色归属
      const deptTreePath = createRoleDto.deptTreePath || "0";
      //  同一归属只有一个角色归属
      const existRole = await this.rolesModel.find({ deptTreePath, name });
      if (existRole.length > 0) {
        throw new ApiException("角色已存在", BusinessErrorCode.ROLE_ALREADY_EXISTS);
      }

      const newRoleModel = new this.rolesModel({
        ...createRoleDto,
      });
      const newRole = await newRoleModel.save();
      return newRole;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  /**
   * 根据 ID 查询角色
   *
   * @param id  角色 ID
   * @returns
   */
  async findOne(id: string) {
    return await this.rolesModel.findById(id).sort({ sort: "asc" }).exec();
  }

  /**
   * 更新角色
   */
  async update(id: string, updateMenuDto: UpdateMenuDto) {
    try {
      return await this.rolesModel.findByIdAndUpdate(id, updateMenuDto, { new: true }).exec();
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 更新角色菜单
   */
  async updateMenus(id: string, menus: []) {
    try {
      // // 确保菜单项是 ObjectId 类型
      // const convertedMenus = menus.map((menu) => new Types.ObjectId(menu));

      return await this.rolesModel.findByIdAndUpdate(id, { menus: menus }, { new: true }).exec();
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async remove(id: string) {
    return await this.rolesModel.findByIdAndDelete(id).exec();
  }
}
