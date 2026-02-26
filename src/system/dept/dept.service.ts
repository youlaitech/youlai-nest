import { Injectable } from "@nestjs/common";
import { CreateDeptDto } from "./dto/create-dept.dto";
import { UpdateDeptDto } from "./dto/update-dept.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { SysDept } from "./entities/sys-dept.entity";
import { SysUser } from "../user/entities/sys-user.entity";
import { BusinessException } from "../../common/exceptions/business.exception";

/**
 * 部门服务
 */
@Injectable()
export class DeptService {
  constructor(
    @InjectRepository(SysDept)
    private readonly deptRepository: Repository<SysDept>,
    @InjectRepository(SysUser)
    private readonly userRepository: Repository<SysUser>
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
    const qb = this.deptRepository.createQueryBuilder("dept");
    qb.where("dept.isDeleted = :isDeleted", { isDeleted: 0 });
    qb.orderBy("dept.sort", "ASC");
    const depts = await qb.getMany();
    return this.buildOptionsTree(depts);
  }

  /**
   * 根据 ID 列表查询部门
   */
  async findByIds(ids: (number | string)[]): Promise<SysDept[]> {
    if (!ids || ids.length === 0) return [];
    const idStrs = ids.map((id) => id.toString());
    return await this.deptRepository.find({
      where: { id: In(idStrs) },
    });
  }

  async findByCode(code: string): Promise<SysDept | null> {
    if (!code?.trim()) return null;
    return await this.deptRepository.findOne({
      where: { code: code.trim(), isDeleted: 0 },
    });
  }

  /**
   * 根据部门编码或名称查找部门（导入时使用，支持编码或名称匹配）
   */
  async findByCodeOrName(codeOrName: string): Promise<SysDept | null> {
    const value = codeOrName?.trim();
    if (!value) return null;

    // 先按编码查
    const deptByCode = await this.deptRepository.findOne({
      where: { code: value, isDeleted: 0 },
    });
    if (deptByCode) return deptByCode;

    // 再按名称查
    return await this.deptRepository.findOne({
      where: { name: value, isDeleted: 0 },
    });
  }

  /**
   * 创建部门
   */
  async create(createDeptDto: CreateDeptDto) {
    // 检查部门编码是否已存在
    if (createDeptDto.code) {
      const existDept = await this.deptRepository.findOne({
        where: { code: createDeptDto.code, isDeleted: 0 },
        select: ["id", "name"],
      });
      if (existDept) {
        throw new BusinessException(`部门编码【${createDeptDto.code}】已存在`);
      }
    }

    // 检查部门名称是否已存在
    if (createDeptDto.name) {
      const existName = await this.deptRepository.findOne({
        where: { name: createDeptDto.name, isDeleted: 0 },
        select: ["id", "name"],
      });
      if (existName) {
        throw new BusinessException(`部门名称【${createDeptDto.name}】已存在`);
      }
    }

    const treePath = await this.buildTreePath(createDeptDto.parentId);
    const dept = this.deptRepository.create({
      ...createDeptDto,
      parentId:
        createDeptDto.parentId === undefined ? undefined : createDeptDto.parentId.toString(),
      createBy:
        createDeptDto.createBy === undefined ? undefined : createDeptDto.createBy.toString(),
      updateBy:
        createDeptDto.updateBy === undefined ? undefined : createDeptDto.updateBy.toString(),
      treePath,
    });
    return await this.deptRepository.save(dept);
  }

  /**
   * 获取部门表单
   */
  async getDeptForm(id: string | number) {
    return await this.deptRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });
  }

  /**
   * 编辑部门
   */
  async updateDept(id: string | number, updateDeptDto: UpdateDeptDto) {
    const idStr = id.toString();
    const dept = await this.deptRepository.findOne({
      where: { id: idStr, isDeleted: 0 },
    });

    if (!dept) {
      return null;
    }

    // 检查部门编码是否已存在（排除当前部门）
    if (updateDeptDto.code) {
      const existCode = await this.deptRepository.findOne({
        where: { code: updateDeptDto.code, isDeleted: 0 },
        select: ["id", "name"],
      });
      if (existCode && existCode.id !== idStr) {
        throw new BusinessException(`部门编码【${updateDeptDto.code}】已存在`);
      }
    }

    // 检查部门名称是否已存在（排除当前部门）
    if (updateDeptDto.name) {
      const existName = await this.deptRepository.findOne({
        where: { name: updateDeptDto.name, isDeleted: 0 },
        select: ["id", "name"],
      });
      if (existName && existName.id !== idStr) {
        throw new BusinessException(`部门名称【${updateDeptDto.name}】已存在`);
      }
    }

    // 构建更新数据对象
    const updateData: Partial<SysDept> = {
      name: updateDeptDto.name,
      code: updateDeptDto.code,
      parentId:
        updateDeptDto.parentId === undefined ? undefined : updateDeptDto.parentId.toString(),
      sort: updateDeptDto.sort,
      status: updateDeptDto.status,
      updateBy:
        updateDeptDto.updateBy === undefined ? undefined : updateDeptDto.updateBy.toString(),
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

    await this.deptRepository.update(idStr, updateData);
    return await this.deptRepository.findOne({ where: { id: idStr } });
  }

  /**
   * 删除部门
   */
  async deleteDept(id: string | number) {
    const idStr = id.toString();

    // 检查是否有子部门
    const hasChildren = await this.deptRepository.findOne({
      where: { parentId: idStr, isDeleted: 0 },
    });
    if (hasChildren) {
      throw new BusinessException("该部门下有子部门，禁止删除");
    }

    // 检查是否有用户关联
    const hasUsers = await this.userRepository.findOne({
      where: { deptId: idStr, isDeleted: 0 },
    });
    if (hasUsers) {
      throw new BusinessException("该部门下有用户关联，禁止删除");
    }

    const result = await this.deptRepository.update({ id: idStr }, { isDeleted: 1 });
    return result.affected > 0;
  }

  /**
   * 构建部门树结构
   */
  private buildDeptTree(deptList: SysDept[]): any[] {
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    deptList.forEach((dept) => {
      map[dept.id] = {
        ...dept,
        children: [],
      };
    });

    deptList.forEach((dept) => {
      if (!dept.parentId || dept.parentId === "0") {
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
    const map: { [key: string]: any } = {};
    const roots: any[] = [];

    depts.forEach((dept) => {
      map[dept.id] = {
        label: dept.name,
        value: dept.id,
        children: [],
      };
    });

    depts.forEach((dept) => {
      if (!dept.parentId || dept.parentId === "0") {
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
  private async buildTreePath(parentId: string | number): Promise<string> {
    if (parentId === 0 || parentId === "0") {
      return "0";
    }
    const parentDept = await this.deptRepository.findOne({
      where: { id: parentId.toString(), isDeleted: 0 },
    });
    return parentDept ? `${parentDept.treePath}/${parentDept.id}` : "0";
  }
}
