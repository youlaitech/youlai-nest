import { Injectable } from "@nestjs/common";
import { CreateDeptDto } from "./dto/create-dept.dto";
import { UpdateDeptDto } from "./dto/update-dept.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysDept } from "./entities/sys-dept.entity";

/**
 * 部门服务
 */
@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(SysDept)
    private readonly deptRepository: Repository<SysDept>
  ) {}

  /**
   * 查询部门列表
   */
  async findAll(keyword?: string, status?: string | number) {
    const queryBuilder = this.deptRepository.createQueryBuilder("dept");
    queryBuilder.where("dept.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keyword) {
      queryBuilder.andWhere("dept.name LIKE :keyword", { keyword: `%${keyword}%` });
    }

    if (status !== undefined && status !== null) {
      queryBuilder.andWhere("dept.status = :status", { status: Number(status) });
    }

    queryBuilder.orderBy("dept.sort", "ASC");
    const deptList = await queryBuilder.getMany();
    return this.buildDeptTree(deptList);
  }

  /**
   * 查询部门下拉树形列表
   */
  async findAllOptions() {
    const depts = await this.deptRepository.find({
      where: { isDeleted: 0 },
      order: { sort: "ASC" },
    });
    return this.buildOptionsTree(depts);
  }

  /**
   * 创建部门
   */
  async create(createDeptDto: CreateDeptDto) {
    const treePath = await this.buildTreePath(createDeptDto.parentId);
    const dept = this.deptRepository.create({
      ...createDeptDto,
      treePath,
    });
    return await this.deptRepository.save(dept);
  }

  /**
   * 获取部门表单
   */
  async getDeptForm(id: number) {
    return await this.deptRepository.findOne({
      where: { id, isDeleted: 0 },
    });
  }

  /**
   * 编辑部门
   */
  async updateDept(id: number, updateDeptDto: UpdateDeptDto) {
    const dept = await this.deptRepository.findOne({
      where: { id, isDeleted: 0 },
    });

    if (!dept) {
      return null;
    }

    // 构建更新数据对象
    const updateData: Partial<SysDept> = {
      name: updateDeptDto.name,
      code: updateDeptDto.code,
      parentId: updateDeptDto.parentId,
      sort: updateDeptDto.sort,
      status: updateDeptDto.status,
      updateBy: updateDeptDto.updateBy,
      updateTime: new Date(),
    };

    // 如果更新了父部门ID，重新构建treePath
    if (updateDeptDto.parentId !== undefined) {
      updateData.treePath = await this.buildTreePath(updateDeptDto.parentId);
    }

    // 过滤掉undefined的字段
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    await this.deptRepository.update(id, updateData);
    return await this.deptRepository.findOne({ where: { id } });
  }

  /**
   * 删除部门
   */
  async deleteDept(id: number) {
    const result = await this.deptRepository.update({ id }, { isDeleted: 1 });
    return result.affected > 0;
  }

  /**
   * 构建部门树结构
   */
  private buildDeptTree(deptList: SysDept[]): any[] {
    const map: { [key: number]: any } = {};
    const roots: any[] = [];

    deptList.forEach((dept) => {
      map[dept.id] = {
        ...dept,
        children: [],
      };
    });

    deptList.forEach((dept) => {
      if (!dept.parentId || dept.parentId === 0) {
        roots.push(map[dept.id]);
      } else {
        if (map[dept.parentId]) {
          map[dept.parentId].children.push(map[dept.id]);
        }
      }
    });

    return roots;
  }

  /**
   * 构建部门选项树
   */
  private buildOptionsTree(depts: SysDept[]): any[] {
    const map: { [key: number]: any } = {};
    const roots: any[] = [];

    depts.forEach((dept) => {
      map[dept.id] = {
        label: dept.name,
        value: dept.id.toString(),
        children: [],
      };
    });

    depts.forEach((dept) => {
      if (!dept.parentId || dept.parentId === 0) {
        roots.push(map[dept.id]);
      } else {
        if (map[dept.parentId]) {
          map[dept.parentId].children.push(map[dept.id]);
        }
      }
    });

    return roots;
  }

  /**
   * 构建部门 treePath
   */
  private async buildTreePath(parentId: number): Promise<string> {
    if (parentId === 0) {
      return "0";
    }
    const parentDept = await this.deptRepository.findOne({
      where: { id: parentId, isDeleted: 0 },
    });
    return parentDept ? `${parentDept.treePath}/${parentDept.id}` : "0";
  }
}
