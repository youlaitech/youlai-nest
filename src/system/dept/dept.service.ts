import { Injectable } from "@nestjs/common";
import { CreateDeptDto } from "./dto/create-dept.dto";
import { UpdateDeptDto } from "./dto/update-dept.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Dept } from "./dept.schema";

/**
 * 部门服务
 */
@Injectable()
export class DeptService {
  constructor(
    @InjectModel(Dept.name)
    private readonly deptModel: Model<Dept>
  ) {}

  /**
   * 查询部门列表
   *
   * @param keyword
   * @param status
   * @returns
   */
  async findAll(keyword: string, status: string | number) {
    const query = {};
    if (keyword) {
      const regex = new RegExp(keyword, "i"); // 'i' 表示不区分大小写
      query["name"] = { $regex: regex };
    }
    if (!isNaN(Number(status))) {
      query["status"] = Number(status);
    }
    const deptList = await this.deptModel
      .aggregate([
        {
          $match: {
            ...query,
            isDeleted: 0,
          },
        },
        { $sort: { sort: 1 } },
        { $addFields: { id: "$_id" } },
        { $project: { _id: 0, __v: 0 } },
      ])
      .exec();
    return this.buildDeptTree(deptList);
  }

  /**
   * 查询部门下拉树形列表
   *
   * @returns
   */
  async findAllOptions() {
    const query = {};
    const Options = await this.deptModel
      .aggregate([
        {
          $match: { ...query, isDeleted: 0 },
        },
        { $sort: { sort: 1 } },
        { $addFields: { id: "$_id" } }, // 将 _id 复制到 id
        { $project: { _id: 0, __v: 0 } }, // 排除 _id 字段
      ])
      .exec();
    return this.buildOptionsTree(Options);
  }

  /**
   * 创建部门
   *
   * @param createDeptDto
   * @returns
   */
  async create(createDeptDto: CreateDeptDto) {
    const TreePath = await this.buildTreePath(createDeptDto.parentId);
    const createdMenu = new this.deptModel({ ...createDeptDto, TreePath });
    await createdMenu.save();
    return await createdMenu.save();
  }

  /**
   * 获取部门表单
   *
   * @param id
   * @returns
   */
  async getDeptForm(id: string) {
    return await this.deptModel.findById(id).exec();
  }

  /**
   * 编辑部门
   *
   * @param id
   * @param updateDeptDto
   * @returns
   */
  async updateDept(id: string, updateDeptDto: UpdateDeptDto) {
    return await this.deptModel.findByIdAndUpdate(id, updateDeptDto).exec();
  }

  /**
   * 删除部门
   *
   * @param id 部门ID
   * @returns
   */
  async deleteDept(id: string) {
    return await this.deptModel.findByIdAndUpdate(id, { isDeleted: true }).exec();
  }
  /**
   * 构建部门树结构
   *
   * @param deptList  部门列表
   * @returns
   */
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
        map.get(menu.parentId.toString()).children.push(map.get(menu.id.toString()));
      } else {
        roots.push(map.get(menu.id.toString()));
      }
    });

    return roots;
  }

  /**
   * 构建部门 TreePath
   *
   * @param parentId 父节点ID
   * @returns
   */
  private async buildTreePath(parentId: string | number) {
    if (Number(parentId) === 0) {
      return "0";
    }
    const parentDept = await this.deptModel.findById(parentId);
    return `${parentDept.TreePath}/${parentDept.id}`;
  }
}
