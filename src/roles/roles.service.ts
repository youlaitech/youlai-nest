import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Roles } from './schemas/role.schema';
import { ApiException } from '../common/http-exception/api.exception';
import { ApiErrorCode } from '../common/enums/api-error-code.enum';
import { UpdateMenuDto } from '../menu/dto/update-menu.dto';
import { matchDeptPath } from '../common/shared/regex-utils';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Roles.name)
    private rolesModel: Model<Roles>,
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService,
  ) {}
  // 创建角色
  async create(createRoleDto: CreateRoleDto) {
    try {
      const name = createRoleDto.name;
      // 角色归属
      const deptTreePath = createRoleDto.deptTreePath || '0';
      //  同一归属只有一个角色归属
      const existRole = await this.rolesModel.find({ deptTreePath, name });
      if (existRole.length > 0) {
        throw new ApiException('角色已存在', ApiErrorCode.ROLE_EXIST);
      }

      const newRoleModel = new this.rolesModel({
        ...createRoleDto,
      });
      const newRole = await newRoleModel.save();
      return newRole;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }
  //  角色查询
  async findSearch(pageNum, pageSize, keywords, deptTreePath) {
    const filter = {};
    if (keywords) {
      const regex = new RegExp(keywords, 'i'); // 'i' 表示不区分大小写
      filter['name'] = { $regex: regex };
    }
    const data = await this.rolesModel
      .find({ ...filter, ...matchDeptPath(deptTreePath) })
      .sort({ sort: 'asc' }) // 根据 sort 字段降序排序
      .skip((pageNum - 1) * pageSize) // 跳过前 (pageNum - 1) * pageSize 条数据
      .limit(pageSize) // 限制每页的数据数量
      .exec();
    const total = await this.rolesModel.countDocuments({ filter }).exec();

    return { list: data, total };
  }

  findAll() {
    return `This action returns all roles`;
  }
  async findroleList(filter) {
    return await this.rolesModel.find(filter);
  }
  async findOne(id: string) {
    return await this.rolesModel.findById(id).sort({ sort: 'asc' }).exec();
  }
  async findMenus(roleIds: string[]) {
    const permIds: string[] = [];
    if (roleIds[0] === 'ROOT') {
      const menuList = await this.menuService.findRouteAll();
      menuList.map((item: any) => {
        permIds.push(item.id);
      });
      return {
        permIds: permIds,
      };
    }
    const roleList = await this.rolesModel
      .find({ _id: { $in: roleIds }, isDeleted: 0 })
      .lean()
      .exec();
    roleList.map((item: any) => {
      permIds.push(...item.menus);
    });
    // 使用 Set 去重
    const uniquePermIds = Array.from(new Set(permIds));
    return { permIds: uniquePermIds };
  }
  async findIds(
    roleIds: string[],
  ): Promise<{ perms: string[]; roles: string[] }> {
    try {
      let perms: string[] = [];
      const menuIds: string[] = [];
      let roles: string[] = [];
      if (roleIds[0] === 'ROOT') {
        perms = await this.menuService.findALLButtons();
        roles = ['ADMIN'];
        return {
          perms: perms,
          roles: roles,
        };
      }
      const roleList: any[] = await this.rolesModel
        .find({ _id: { $in: roleIds } })
        .lean()
        .exec();

      roleList.map((item: any) => {
        menuIds.push(...item.menus);
        roles.push(item.code);
      });
      perms = await this.menuService.findButtons(menuIds);
      return {
        perms: perms,
        roles: roles,
      };
    } catch (error) {
      console.log(error);
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }
  async findOptions(ascription: any) {
    const results = await this.rolesModel.find().sort({ sort: 'asc' }).exec();
    // 使用 map 方法将 name 字段改为 aaa
    const mappedResults = results.map((result) => {
      return {
        label: result.name, // 将 name 改为 aaa
        value: result._id,
      };
    });

    return mappedResults;
  }
  async update(id: string, updateMenuDto: UpdateMenuDto) {
    try {
      return await this.rolesModel
        .findByIdAndUpdate(id, updateMenuDto, { new: true })
        .exec();
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async updateMenus(id: string, menus: []) {
    try {
      // // 确保菜单项是 ObjectId 类型
      // const convertedMenus = menus.map((menu) => new Types.ObjectId(menu));

      return await this.rolesModel
        .findByIdAndUpdate(id, { menus: menus }, { new: true })
        .exec();
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }

  async remove(id: string) {
    return await this.rolesModel.findByIdAndDelete(id).exec();
  }
}
