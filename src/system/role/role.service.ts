import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { MenuService } from "../menu/menu.service";
import { BusinessException } from "../../common/exceptions/business.exception";

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRole)
    private roleRepository: Repository<SysRole>,
    @InjectRepository(SysRoleMenu)
    private roleMenuRepository: Repository<SysRoleMenu>,
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService
  ) {}

  /**
   * 角色分页列表
   */
  async getRolePage(pageNum: number, pageSize: number, keywords?: string) {
    const queryBuilder = this.roleRepository.createQueryBuilder("role");
    queryBuilder.where("role.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keywords) {
      queryBuilder.andWhere("role.name LIKE :keywords", { keywords: `%${keywords}%` });
    }

    queryBuilder.orderBy("role.sort", "ASC");
    queryBuilder.skip((pageNum - 1) * pageSize);
    queryBuilder.take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();
    return { list, total };
  }

  /**
   * 根据角色查询菜单
   */
  async getMenuIdsByRoleIds(roleIds: number[]): Promise<number[]> {
    if (!roleIds?.length) return [];

    const roleMenus = await this.roleMenuRepository
      .createQueryBuilder("roleMenu")
      .where("roleMenu.roleId IN (:...roleIds)", { roleIds })
      .getMany();

    return [...new Set(roleMenus.map((rm) => rm.menuId))];
  }

  /**
   * 根据角色编码查询权限标识集合
   */
  async findPermsByRoleCodes(roles: string[]): Promise<string[]> {
    try {
      if (!roles?.length) return [];

      // 1. 根据角色编码查询角色ID
      const roleEntities = await this.roleRepository.find({
        where: { code: In(roles), status: 1 },
        select: ["id"],
      });

      if (!roleEntities?.length) return [];

      const roleIds = roleEntities.map((role) => role.id);

      // 2. 根据角色ID查询关联的菜单ID
      const roleMenus = await this.roleMenuRepository.find({
        where: { roleId: In(roleIds) },
      });

      if (!roleMenus?.length) return [];

      // 3. 提取菜单ID并去重
      const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId.toString()))];

      // 4. 根据菜单ID查询权限标识
      return await this.menuService.findPermsByMenuIds(menuIds);
    } catch (error) {
      console.error("获取角色权限失败:", error);
      return [];
    }
  }

  /**
   * 角色下拉列表
   */
  async getRoleOptions() {
    const roles = await this.roleRepository.find({
      where: { isDeleted: 0 },
      order: { sort: "ASC" },
    });

    return roles
      .filter(({ name }) => !!name?.trim())
      .map(({ id, name }) => ({
        label: name,
        value: id.toString(),
      }));
  }

  /**
   * 创建角色
   */
  async create(createRoleDto: CreateRoleDto) {
    const existRole = await this.roleRepository.findOne({
      where: { name: createRoleDto.name, isDeleted: 0 },
    });

    if (existRole) {
      throw new BusinessException("角色已存在");
    }

    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
  }

  /**
   * 根据 ID 查询角色
   */
  async getRoleForm(id: number) {
    return await this.roleRepository.findOne({
      where: { id, isDeleted: 0 },
    });
  }

  /**
   * 更新角色
   */
  async update(id: number, updateRoleDto: UpdateRoleDto) {
    return await this.roleRepository.update(id, updateRoleDto);
  }

  /**
   * 更新角色菜单
   */
  async updateMenus(roleId: number, menuIds: number[]) {
    // 先删除原有的关联
    await this.roleMenuRepository.delete({ roleId });

    // 创建新的关联
    const roleMenus = menuIds.map((menuId) => ({
      roleId,
      menuId,
    }));

    return await this.roleMenuRepository.save(roleMenus);
  }

  /**
   * 删除角色
   */
  async remove(id: number) {
    return await this.roleRepository.update(id, { isDeleted: 1 });
  }

  /**
   * 查询角色信息
   */
  async findRolesByIds(roleIds: number[]): Promise<SysRole[]> {
    return await this.roleRepository.find({
      where: { id: In(roleIds), isDeleted: 0 },
      select: ["code", "dataScope"],
    });
  }

  /**
   * 获取所有权限标识
   */
  async findAllPerms(): Promise<string[]> {
    return await this.menuService.findALLButtons();
  }
}
