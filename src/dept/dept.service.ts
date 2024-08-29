import { Injectable } from '@nestjs/common';
import { CreateDeptDto } from './dto/create-dept.dto';
import { UpdateDeptDto } from './dto/update-dept.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Depts } from './schemas/dept.schema';
import { ApiException } from '../common/http-exception/api.exception';
import { ApiErrorCode } from '../common/enums/api-error-code.enum';
import { matchDeptPath, rolesDeptPath } from '../common/shared/regex-utils';

@Injectable()
export class DeptService {
  constructor(
    @InjectModel(Depts.name) private readonly deptModel: Model<Depts>,
  ) {}
  async create(createDeptDto: CreateDeptDto) {
    try {
      //  TreePath 的处理
      const TreePath = await this.buildTreePath(createDeptDto.parentId);

      const createdMenu = new this.deptModel({ ...createDeptDto, TreePath });
      await createdMenu.save();
      return await createdMenu.save();
    } catch (error) {
      throw new ApiException(error, ApiErrorCode.DATABASE_ERROR);
    }
  }

  async findAll(deptTreePath: string) {
    //  return await this.menuModel.find().exec();
    const query = {};
    return await this.deptModel
      .find({ ...query, ...matchDeptPath(deptTreePath), isDeleted: 0 })
      .sort({ sort: 'asc' })
      .exec();
  }
  async findAllOptions(deptTreePath) {
    try {
      const query = {};
      const Options = await this.deptModel
        .aggregate([
          {
            $match: { ...query, ...matchDeptPath(deptTreePath), isDeleted: 0 },
          },
          { $sort: { sort: 1 } },
          { $addFields: { id: '$_id' } }, // 将 _id 复制到 id
          { $project: { _id: 0, __v: 0 } }, // 排除 _id 字段
        ])
        .exec();
      return this.buildOptionsTree(Options);
    } catch (error) {
      // 处理错误逻辑

      throw new ApiException(error, ApiErrorCode.DATABASE_ERROR);
    }
  }
  async findSearch(
    keyword: string,
    status: string | number,
    deptTreePath: string | number,
  ) {
    try {
      const query = {};
      if (keyword) {
        const regex = new RegExp(keyword, 'i'); // 'i' 表示不区分大小写
        query['name'] = { $regex: regex };
      }
      if (!isNaN(Number(status))) {
        query['status'] = Number(status);
      }
      const deptList = await this.deptModel
        .aggregate([
          {
            $match: {
              ...query,
              ...rolesDeptPath(deptTreePath),
              isDeleted: 0,
            },
          },
          { $sort: { sort: 1 } },
          { $addFields: { id: '$_id' } },
          { $project: { _id: 0, __v: 0 } },
        ])
        .exec();
      return this.buildDeptTree(deptList);
    } catch (error) {
      // 处理错误逻辑
      throw new ApiException(error, ApiErrorCode.DATABASE_ERROR);
    }
  }

  async findOne(id: number | string) {
    return await this.deptModel.findById(id).sort({ sort: 'asc' }).exec();
  }

  async update(id: string, updateDeptDto: UpdateDeptDto) {
    try {
      return await this.deptModel
        .findByIdAndUpdate(id, updateDeptDto, { new: true })
        .exec();
    } catch (e) {}
  }

  async remove(id: string) {
    return await this.deptModel.findByIdAndDelete(id).exec();
  }
  async deleted(id: string) {
    return await this.deptModel
      .findByIdAndUpdate(id, { isDeleted: true })
      .exec();
  }
  // 菜单树形数据处理
  private buildDeptTree(deptList: any[]): any[] {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    // 为每个菜单项创建一个映射
    deptList.forEach((dept) => {
      // 复制对象并初始化children为数组
      map[dept.id] = {
        ...dept,
        children: [],
        id: dept.id,
      };
    });

    // 组装树结构
    deptList.forEach((dept) => {
      // 如果菜单项没有parentId或者parentId为0，视为根节点
      if (dept.parentId === 0 || !map[dept.parentId]) {
        roots.push(map[dept.id]);
      } else {
        // 如果有parentId，则将其添加到父菜单的children中
        if (map[dept.parentId]) {
          map[dept.parentId].children.push(map[dept.id]);
        }
      }
    });

    return roots;
  }
  // 树结构数据
  private buildOptionsTree(menus: any[]): any[] {
    try {
      const map = new Map<string, any>();
      const roots: any[] = [];

      // 为每个菜单项创建一个 Map，并初始化 children
      menus.forEach((menu) => {
        map.set(menu.id.toString(), {
          label: menu.name,
          value: menu.id,
          children: [],
        });
      });

      // 遍历菜单项，根据 parentId 构建树形结构
      menus.forEach((menu) => {
        if (menu.parentId && map.has(menu.parentId.toString())) {
          map
            .get(menu.parentId.toString())
            .children.push(map.get(menu.id.toString()));
        } else {
          roots.push(map.get(menu.id.toString()));
        }
      });

      return roots;
    } catch (error) {
      // 处理错误逻辑

      throw new ApiException(error, ApiErrorCode.DATABASE_ERROR);
    }
  }
  private async buildTreePath(parentId: string | number) {
    try {
      if (Number(parentId) === 0) {
        return '0';
      }
      const parentDept = await this.deptModel.findById(parentId);
      return `${parentDept.TreePath}/${parentDept.id}`;
    } catch (error) {
      // 处理错误逻辑

      throw new ApiException(error, ApiErrorCode.DATABASE_ERROR);
    }
  }
}
