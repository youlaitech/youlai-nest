import { forwardRef, Inject, Injectable, Logger } from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Brackets } from "typeorm";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { MenuService } from "../menu/menu.service";
import { BusinessException } from "../../common/exceptions/business.exception";
import { SysUserRole } from "../user/entities/sys-user-role.entity";

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectRepository(SysRole)
    private roleRepository: Repository<SysRole>,
    @InjectRepository(SysRoleMenu)
    private roleMenuRepository: Repository<SysRoleMenu>,
    @InjectRepository(SysUserRole)
    private userRoleRepository: Repository<SysUserRole>,
    @Inject(forwardRef(() => MenuService))
    private readonly menuService: MenuService
  ) {}

  async findRoleIdsByCodes(roleCodes: string[]): Promise<string[]> {
    const codes = (roleCodes || []).map((c) => (c ?? "").trim()).filter(Boolean);
    if (!codes.length) return [];

    const roles = await this.roleRepository.find({
      where: { code: In(codes), isDeleted: 0 },
      select: ["id"],
    });

    return roles.map((r) => r.id);
  }

  async saveRole(
    roleForm: Partial<CreateRoleDto> & Partial<UpdateRoleDto> & { id?: string | number }
  ) {
    const roleId = roleForm.id?.toString();

    let oldRole: SysRole | null = null;
    if (roleId) {
      oldRole = await this.roleRepository.findOne({ where: { id: roleId, isDeleted: 0 } });
      if (!oldRole) {
        throw new BusinessException("角色不存在");
      }
    }

    const roleCode = (roleForm as any).code;
    const roleName = (roleForm as any).name;

    const dupQuery = this.roleRepository
      .createQueryBuilder("role")
      .where("role.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere(
        new Brackets((qb) => {
          qb.where("role.code = :code", { code: roleCode }).orWhere("role.name = :name", {
            name: roleName,
          });
        })
      );

    if (roleId) {
      dupQuery.andWhere("role.id != :roleId", { roleId });
    }

    const dupCount = await dupQuery.getCount();
    if (dupCount > 0) {
      throw new BusinessException("角色名称或角色编码已存在，请修改后重试！");
    }

    const now = new Date();
    const entity = this.roleRepository.create({
      ...(oldRole ?? {}),
      ...(roleForm as any),
      id: roleId,
      isDeleted: 0,
      createTime: oldRole?.createTime ?? now,
      updateTime: now,
    });

    await this.roleRepository.save(entity);
    return true;
  }

  /**
   * 角色分页列表
   */
  async getRolePage(pageNum: number, pageSize: number, keywords?: string) {
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    // 系统内置角色不允许在业务列表里维护（避免误操作）
    const reservedCodes = ["ROOT"];
    const queryBuilder = this.roleRepository.createQueryBuilder("role");
    queryBuilder.where("role.isDeleted = :isDeleted", { isDeleted: 0 });
    // 排除系统内置角色（例如：超级管理员/系统管理员）不在列表中展示
    queryBuilder.andWhere("role.code NOT IN (:...reservedCodes)", { reservedCodes });

    if (keywords) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where("role.name LIKE :keywords", { keywords: `%${keywords}%` }).orWhere(
            "role.code LIKE :keywords",
            { keywords: `%${keywords}%` }
          );
        })
      );
    }

    queryBuilder.orderBy("role.sort", "ASC");
    queryBuilder.addOrderBy("role.createTime", "DESC");
    queryBuilder.addOrderBy("role.updateTime", "DESC");
    queryBuilder.skip((pageNumSafe - 1) * pageSizeSafe);
    queryBuilder.take(pageSizeSafe);

    const [list, total] = await queryBuilder.getManyAndCount();
    return {
      data: list,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  /**
   * 根据角色查询菜单
   */
  async getMenuIdsByRoleIds(roleIds: string[]): Promise<string[]> {
    if (!roleIds?.length) return [];
    const ids = roleIds.map((id) => id.toString());

    const roleMenus = await this.roleMenuRepository
      .createQueryBuilder("roleMenu")
      .where("roleMenu.roleId IN (:...roleIds)", { roleIds: ids })
      .getMany();

    return [...new Set(roleMenus.map((rm) => rm.menuId))];
  }

  async getRoleMenuIds(roleId: string): Promise<string[]> {
    return await this.getMenuIdsByRoleIds([roleId.toString()]);
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
      this.logger.error("获取角色权限失败", (error as any)?.stack ?? String(error));
      return [];
    }
  }

  /**
   * 角色下拉列表
   */
  async getRoleOptions() {
    const reservedCodes = ["ROOT"];
    const roles = await this.roleRepository
      .createQueryBuilder("role")
      .where("role.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere("role.code NOT IN (:...reservedCodes)", { reservedCodes })
      .orderBy("role.sort", "ASC")
      .getMany();

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
  async getRoleForm(id: string) {
    return await this.roleRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });
  }

  /**
   * 更新角色
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    return await this.roleRepository.update(id.toString(), updateRoleDto);
  }

  async updateRoleStatus(roleId: string, status: number): Promise<boolean> {
    const roleIdStr = roleId.toString();
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr, isDeleted: 0 },
      select: ["id"],
    });

    if (!role) {
      throw new BusinessException("角色不存在");
    }

    const result = await this.roleRepository.update(roleIdStr, { status: Number(status) });
    return (result.affected ?? 0) > 0;
  }

  /**
   * 更新角色菜单
   */
  async updateMenus(roleId: string, menuIds: string[]) {
    const roleIdStr = roleId.toString();
    // 先删除原有的关联
    await this.roleMenuRepository.delete({ roleId: roleIdStr });

    // 直接重建关联表（sys_role_menu）
    const roleMenus = menuIds.map((menuId) => ({
      roleId: roleIdStr,
      menuId: menuId.toString(),
    }));

    return await this.roleMenuRepository.save(roleMenus);
  }

  /**
   * 删除角色
   */
  async remove(id: string) {
    return await this.roleRepository.update(id.toString(), { isDeleted: 1 });
  }

  async deleteRoles(ids: string) {
    if (!ids?.trim()) {
      throw new BusinessException("删除的角色ID不能为空");
    }

    const roleIds = ids
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => v);

    for (const roleId of roleIds) {
      const role = await this.roleRepository.findOne({ where: { id: roleId, isDeleted: 0 } });
      if (!role) {
        throw new BusinessException("角色不存在");
      }

      const assignedCount = await this.userRoleRepository.count({ where: { roleId } });
      if (assignedCount > 0) {
        throw new BusinessException(`角色【${role.name}】已分配用户，请先解除关联后删除`);
      }

      await this.roleMenuRepository.delete({ roleId });
      await this.roleRepository.update(roleId, { isDeleted: 1 });
    }
  }

  /**
   * 查询角色信息
   */
  async findRolesByIds(roleIds: string[]): Promise<SysRole[]> {
    const ids = roleIds.map((id) => id.toString());
    return await this.roleRepository.find({
      where: { id: In(ids), isDeleted: 0 },
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
