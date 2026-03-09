import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RedisService } from "../../core/redis/redis.service";
import { RedisConstants } from "../../common/constants/redis.constants";
import { SysRoleMenu } from "./entities/sys-role-menu.entity";
import { SysRole } from "./entities/sys-role.entity";
import { SysMenu } from "../menu/entities/sys-menu.entity";

/**
 * 角色权限缓存服务
 *
 * 负责管理角色与权限标识的映射关系，采用 Read-Through 缓存策略：
 * - 优先从 Redis Hash 缓存读取
 * - 缓存未命中时自动回源数据库并写入缓存
 *
 * 缓存结构：
 * - Key: system:role:perms
 * - Field: 角色编码
 * - Value: 权限标识数组
 */
@Injectable()
export class RolePermService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RolePermService.name);
  private readonly cacheKey = RedisConstants.System.ROLE_PERMS;

  constructor(
    @InjectRepository(SysRoleMenu)
    private roleMenuRepository: Repository<SysRoleMenu>,
    @InjectRepository(SysRole)
    private roleRepository: Repository<SysRole>,
    @InjectRepository(SysMenu)
    private menuRepository: Repository<SysMenu>,
    private readonly redisService: RedisService
  ) {}

  /**
   * 应用启动时预热权限缓存
   */
  async onApplicationBootstrap() {
    try {
      await this.refreshAllRolePermsCache();
      this.logger.log("角色权限缓存预热完成");
    } catch (err) {
      this.logger.error("角色权限缓存预热失败", err);
    }
  }

  /**
   * 刷新所有角色的权限缓存
   *
   * 清空现有缓存，重新从数据库加载所有角色的权限标识
   */
  async refreshAllRolePermsCache(): Promise<void> {
    // 清空现有缓存
    await this.redisService.delHash(this.cacheKey);

    // 从数据库获取所有角色权限映射
    const rolePermsList = await this.getRolePermsListFromDB();

    // 写入缓存
    for (const item of rolePermsList) {
      if (item.perms && item.perms.length > 0) {
        await this.redisService.hset(this.cacheKey, item.roleCode, item.perms);
      }
    }

    this.logger.log(`权限缓存刷新完成，共 ${rolePermsList.length} 个角色`);
  }

  /**
   * 刷新指定角色的权限缓存
   *
   * @param roleCode 角色编码
   */
  async refreshRolePermsCache(roleCode: string): Promise<void> {
    // 删除该角色的缓存
    await this.redisService.hdel(this.cacheKey, roleCode);

    // 从数据库重新获取
    const perms = await this.getRolePermsByRoleCodeFromDB(roleCode);

    // 写入缓存（空数组也写入，防止缓存穿透）
    await this.redisService.hset(this.cacheKey, roleCode, perms);

    this.logger.log(`角色 [${roleCode}] 权限缓存刷新完成`);
  }

  /**
   * 刷新角色权限缓存（角色编码变更时调用）
   *
   * @param oldRoleCode 旧角色编码
   * @param newRoleCode 新角色编码
   */
  async refreshRolePermsCacheOnCodeChange(oldRoleCode: string, newRoleCode: string): Promise<void> {
    // 删除新旧两个角色的缓存
    await this.redisService.hdel(this.cacheKey, oldRoleCode, newRoleCode);

    // 重新获取新角色编码的权限
    const perms = await this.getRolePermsByRoleCodeFromDB(newRoleCode);

    // 写入缓存
    await this.redisService.hset(this.cacheKey, newRoleCode, perms);

    this.logger.log(`角色编码变更: ${oldRoleCode} -> ${newRoleCode}，权限缓存已刷新`);
  }

  /**
   * 获取角色权限集合（带缓存）
   *
   * 采用 Read-Through 缓存策略：
   * 1. 优先从 Redis Hash 缓存读取
   * 2. 缓存未命中时回源数据库并写入缓存
   *
   * @param roleCodes 角色编码集合
   * @returns 权限标识集合
   */
  async getPermsByRoleCodes(roleCodes: string[]): Promise<string[]> {
    if (!roleCodes || roleCodes.length === 0) {
      return [];
    }

    const uniqueRoleCodes = [...new Set(roleCodes)];
    const perms: Set<string> = new Set();
    const missingRoleCodes: string[] = [];

    // 1. 尝试从缓存批量获取
    const cachedPermsList = await this.redisService.hmget<string[]>(this.cacheKey, uniqueRoleCodes);

    for (let i = 0; i < uniqueRoleCodes.length; i++) {
      const cachedPerms = cachedPermsList[i];
      const roleCode = uniqueRoleCodes[i];

      if (cachedPerms === null) {
        // 缓存未命中，记录需要回源的角色
        missingRoleCodes.push(roleCode);
      } else if (Array.isArray(cachedPerms)) {
        // 缓存命中，合并权限
        cachedPerms.forEach((p) => perms.add(p));
      }
    }

    // 2. 回源数据库并同步到缓存
    if (missingRoleCodes.length > 0) {
      for (const roleCode of missingRoleCodes) {
        const dbPerms = await this.getRolePermsByRoleCodeFromDB(roleCode);
        // 写入缓存（空数组也写入，防止缓存穿透）
        await this.redisService.hset(this.cacheKey, roleCode, dbPerms);
        dbPerms.forEach((p) => perms.add(p));
      }
    }

    return Array.from(perms);
  }

  /**
   * 从数据库获取角色权限列表
   *
   * @param roleCode 可选，指定角色编码时只返回该角色的权限
   * @returns 角色权限映射列表
   */
  private async getRolePermsListFromDB(
    roleCode?: string
  ): Promise<{ roleCode: string; perms: string[] }[]> {
    // 查询角色-菜单关联
    const queryBuilder = this.roleMenuRepository
      .createQueryBuilder("rm")
      .innerJoin("rm.role", "role")
      .innerJoin("rm.menu", "menu")
      .where("role.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere("role.status = :status", { status: 1 })
      .andWhere("menu.type = :menuType", { menuType: "B" }) // 按钮类型
      .andWhere("menu.perm IS NOT NULL")
      .select(["role.code AS roleCode", "menu.perm AS perm"]);

    if (roleCode) {
      queryBuilder.andWhere("role.code = :roleCode", { roleCode });
    }

    const results = await queryBuilder.getRawMany();

    // 按角色编码分组
    const rolePermsMap = new Map<string, string[]>();
    for (const row of results) {
      const code = row.roleCode;
      const perm = row.perm;
      if (!rolePermsMap.has(code)) {
        rolePermsMap.set(code, []);
      }
      rolePermsMap.get(code)!.push(perm);
    }

    // 转换为数组返回
    return Array.from(rolePermsMap.entries()).map(([roleCode, perms]) => ({
      roleCode,
      perms,
    }));
  }

  /**
   * 从数据库获取单个角色的权限
   *
   * @param roleCode 角色编码
   * @returns 权限标识数组
   */
  private async getRolePermsByRoleCodeFromDB(roleCode: string): Promise<string[]> {
    const results = await this.roleMenuRepository
      .createQueryBuilder("rm")
      .innerJoin("rm.role", "role")
      .innerJoin("rm.menu", "menu")
      .where("role.code = :roleCode", { roleCode })
      .andWhere("role.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere("role.status = :status", { status: 1 })
      .andWhere("menu.type = :menuType", { menuType: "B" })
      .andWhere("menu.perm IS NOT NULL")
      .select("menu.perm", "perm")
      .getRawMany();

    return results.map((r) => r.perm);
  }

  /**
   * 获取所有权限标识（超级管理员使用）
   *
   * @returns 所有按钮权限标识
   */
  async getAllPerms(): Promise<string[]> {
    const menus = await this.menuRepository.find({
      where: { type: "B" },
      select: ["perm"],
    });
    return menus.map((m) => m.perm).filter((p): p is string => !!p);
  }
}
