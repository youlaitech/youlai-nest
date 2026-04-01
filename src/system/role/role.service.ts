import { forwardRef, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Brackets } from "typeorm";
import { SysRole } from "./entities/sys-role.entity";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { SysRoleDept } from "./entities/sys-role-dept.entity";
import { RolePermService } from "./role-permission.service";
import { BusinessException } from "../../common/exceptions/business.exception";
import { SysUserRole } from "../user/entities/sys-user-role.entity";
import { ROOT_ROLE_CODE } from "../../common/constants/role.constant";
import { RedisService } from "../../common/redis/redis.service";
import { RoleDataScope } from "../../common/models/role-data-scope.model";
import { DataScopeEnum } from "../../common/enums/data-scope.enum";

/**
 * 角色服务
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(SysRole)
    private roleRepository: Repository<SysRole>,
    @InjectRepository(SysRoleMenu)
    private roleMenuRepository: Repository<SysRoleMenu>,
    @InjectRepository(SysUserRole)
    private userRoleRepository: Repository<SysUserRole>,
    @InjectRepository(SysRoleDept)
    private roleDeptRepository: Repository<SysRoleDept>,
    @Inject(forwardRef(() => RolePermService))
    private readonly rolePermService: RolePermService,
    private readonly configService: ConfigService,
    private readonly redisCacheService: RedisService
  ) {}

  private async invalidateUsersSessions(userIds: string[]): Promise<void> {
    const ids = (userIds || []).map((v) => v?.toString()).filter(Boolean);
    if (ids.length === 0) return;

    const sessionType = this.configService.get<string>("SESSION_TYPE") || "jwt";
    for (const userId of ids) {
      const versionKey = `auth:user:token_version:${userId}`;
      const currentVersion = await this.redisCacheService.get<number>(versionKey);
      const nextVersion = (currentVersion ?? 0) + 1;
      await this.redisCacheService.set(versionKey, nextVersion);
      await this.redisCacheService.del(`auth:user:jwt_session:${userId}`);

      if (sessionType === "redis-token") {
        const accessKey = `auth:user:access:${userId}`;
        const refreshKey = `auth:user:refresh:${userId}`;

        const accessToken = await this.redisCacheService.get<string>(accessKey);
        const refreshToken = await this.redisCacheService.get<string>(refreshKey);

        if (accessToken) {
          await this.redisCacheService.del(`auth:token:access:${accessToken}`);
        }
        if (refreshToken) {
          await this.redisCacheService.del(`auth:token:refresh:${refreshToken}`);
        }

        await this.redisCacheService.del(accessKey);
        await this.redisCacheService.del(refreshKey);
      }
    }
  }

  async findRoleIdsByCodes(roleCodes: string[]): Promise<string[]> {
    const codes = (roleCodes || []).map((c) => (c ?? "").trim()).filter(Boolean);
    const roles = await this.roleRepository.find({
      where: { code: In(codes), isDeleted: 0 },
      select: ["id"],
    });

    return roles.map((r) => r.id);
  }

  /**
   * 根据角色编码或名称查找角色ID（导入时使用，支持编码或名称匹配）
   */
  async findRoleIdsByCodesOrNames(codesOrNames: string[]): Promise<string[]> {
    const items = (codesOrNames || []).map((c) => (c ?? "").trim()).filter(Boolean);
    if (!items.length) return [];

    // 先按编码查
    const rolesByCode = await this.roleRepository.find({
      where: { code: In(items), isDeleted: 0 },
      select: ["id", "code"],
    });

    const foundCodes = new Set(rolesByCode.map((r) => r.code));
    const remaining = items.filter((it) => !foundCodes.has(it));

    // 未匹配的按名称查
    if (remaining.length) {
      const rolesByName = await this.roleRepository.find({
        where: { name: In(remaining), isDeleted: 0 },
        select: ["id"],
      });
      return [...rolesByCode.map((r) => r.id), ...rolesByName.map((r) => r.id)];
    }

    return rolesByCode.map((r) => r.id);
  }

  /**
   * 保存角色（新增或更新）
   */
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

    // 数据权限发生变化时，失效该角色关联用户的登录态（JWT tokenVersion）
    if (oldRole && oldRole.dataScope !== (entity as any).dataScope) {
      const relations = await this.userRoleRepository.find({ where: { roleId: roleId } });
      const userIds = relations.map((r) => r.userId?.toString()).filter(Boolean);
      await this.invalidateUsersSessions(userIds);
    }
    return true;
  }

  /**
   * 角色分页列表
   */
  async getRolePage(pageNum: number, pageSize: number, keywords?: string) {
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const reservedCodes = [ROOT_ROLE_CODE];
    const queryBuilder = this.roleRepository.createQueryBuilder("role");
    queryBuilder.where("role.isDeleted = :isDeleted", { isDeleted: 0 });
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

    const dataScopeLabelMap: Record<number, string> = {
      [DataScopeEnum.ALL]: "全部数据",
      [DataScopeEnum.DEPT_AND_SUB]: "部门及子部门数据",
      [DataScopeEnum.DEPT]: "本部门数据",
      [DataScopeEnum.SELF]: "本人数据",
      [DataScopeEnum.CUSTOM]: "自定义部门数据",
    };

    const data = list.map((item) => ({
      ...(item as any),
      dataScopeLabel: dataScopeLabelMap[item.dataScope] ?? "",
    }));
    return {
      data,
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
   * 角色下拉列表
   */
  async getRoleOptions() {
    const reservedCodes = [ROOT_ROLE_CODE];
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
    return await this.saveRole(createRoleDto);
  }

  /**
   * 根据 ID 查询角色
   */
  async getRoleForm(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });
    if (!role) {
      return null;
    }

    // 自定义数据权限时回显部门ID列表
    if (role.dataScope === DataScopeEnum.CUSTOM) {
      const deptIds = await this.getRoleDeptIds(role.id);
      return {
        ...(role as any),
        deptIds,
      };
    }

    return role;
  }

  /**
   * 更新角色
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    return await this.saveRole({ ...updateRoleDto, id });
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
   *
   * 更新后需要：
   * 1. 刷新该角色的权限缓存
   * 2. 使已登录用户的会话失效（触发重新加载权限）
   */
  async updateMenus(roleId: string, menuIds: string[]) {
    const roleIdStr = roleId.toString();

    // 获取角色编码（用于刷新权限缓存）
    const role = await this.roleRepository.findOne({
      where: { id: roleIdStr, isDeleted: 0 },
      select: ["id", "code"],
    });

    // 删除旧的菜单关联
    await this.roleMenuRepository.delete({ roleId: roleIdStr });

    // 添加新的菜单关联
    const roleMenus = menuIds.map((menuId) => ({
      roleId: roleIdStr,
      menuId: menuId.toString(),
    }));

    const saved = await this.roleMenuRepository.save(roleMenus);

    // 刷新角色权限缓存
    if (role?.code) {
      await this.rolePermService.refreshRolePermsCache(role.code);
    }

    // 使已登录用户的会话失效
    const relations = await this.userRoleRepository.find({ where: { roleId: roleIdStr } });
    const userIds = relations.map((r) => r.userId?.toString()).filter(Boolean);
    await this.invalidateUsersSessions(userIds);

    return saved;
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
        continue;
      }

      // 系统内置角色禁止删除
      if (role.code === ROOT_ROLE_CODE) {
        throw new BusinessException(`系统内置角色【${role.name}】禁止删除`);
      }

      const assignedCount = await this.userRoleRepository.count({ where: { roleId } });
      if (assignedCount > 0) {
        throw new BusinessException(`角色【${role.name}】已分配用户，请先解除关联后删除`);
      }

      await this.roleMenuRepository.delete({ roleId });
      await this.roleRepository.update(roleId, { isDeleted: 1 });

      // 刷新角色权限缓存（删除角色编码对应的缓存）
      await this.rolePermService.refreshRolePermsCache(role.code);
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
   * 获取角色的数据权限列表
   *
   * 支持多角色数据权限，返回每个角色的数据权限信息
   *
   * @param roleCodes 角色编码列表
   * @returns 角色数据权限列表
   */
  async getRoleDataScopes(roleCodes: string[]): Promise<RoleDataScope[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    const roles = await this.roleRepository
      .createQueryBuilder("role")
      .select(["role.code", "role.dataScope"])
      .where("role.code IN (:...roleCodes)", { roleCodes })
      .andWhere("role.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere("role.status = :status", { status: 1 })
      .getMany();

    if (!roles || roles.length === 0) {
      return [];
    }

    const customRoleCodes = roles
      .filter((r) => r.dataScope === DataScopeEnum.CUSTOM)
      .map((r) => r.code);

    const customDeptIdsMap = new Map<string, number[]>();

    if (customRoleCodes.length > 0) {
      const customRoles = await this.roleRepository.find({
        where: { code: In(customRoleCodes), isDeleted: 0 },
        select: ["id", "code"],
      });

      const customRoleIds = customRoles.map((r) => r.id);
      const roleIdToCodeMap = new Map(customRoles.map((r) => [r.id, r.code]));

      if (customRoleIds.length > 0) {
        const roleDepts = await this.roleDeptRepository
          .createQueryBuilder("rd")
          .where("rd.roleId IN (:...roleIds)", { roleIds: customRoleIds })
          .getMany();

        // 按角色编码分组
        for (const rd of roleDepts) {
          const roleCode = roleIdToCodeMap.get(rd.roleId);
          if (roleCode) {
            if (!customDeptIdsMap.has(roleCode)) {
              customDeptIdsMap.set(roleCode, []);
            }
            customDeptIdsMap.get(roleCode)!.push(Number(rd.deptId));
          }
        }
      }
    }

    // 4. 构建 RoleDataScope 列表
    const result: RoleDataScope[] = roles.map((role) => {
      const customDeptIds = customDeptIdsMap.get(role.code);
      return new RoleDataScope(role.code, role.dataScope, customDeptIds);
    });

    return result;
  }

  /**
   * 更新角色部门（自定义数据权限）
   *
   * @param roleId 角色ID
   * @param deptIds 部门ID列表
   */
  async updateRoleDepts(roleId: string, deptIds: string[]): Promise<void> {
    const roleIdStr = roleId.toString();

    // 删除旧的关联
    await this.roleDeptRepository.delete({ roleId: roleIdStr });

    // 添加新的关联
    if (deptIds && deptIds.length > 0) {
      const roleDepts = deptIds.map((deptId) => ({
        roleId: roleIdStr,
        deptId: deptId.toString(),
      }));
      await this.roleDeptRepository.save(roleDepts);
    }

    // 使相关用户的会话失效
    const relations = await this.userRoleRepository.find({ where: { roleId: roleIdStr } });
    const userIds = relations.map((r) => r.userId?.toString()).filter(Boolean);
    await this.invalidateUsersSessions(userIds);
  }

  /**
   * 获取角色的自定义部门ID列表
   *
   * @param roleId 角色ID
   * @returns 部门ID列表
   */
  async getRoleDeptIds(roleId: string): Promise<string[]> {
    const roleDepts = await this.roleDeptRepository.find({
      where: { roleId: roleId.toString() },
    });
    return roleDepts.map((rd) => rd.deptId);
  }
}
