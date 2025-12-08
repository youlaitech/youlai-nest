import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { SysConfig } from "./entities/sys-config.entity";
import { ConfigPageQueryDto } from "./dto/config-page-query.dto";
import { CreateConfigDto, UpdateConfigDto } from "./dto/config-form.dto";
import { RedisService } from "src/shared/redis/redis.service";

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(SysConfig)
    private configRepository: Repository<SysConfig>,
    private redisService: RedisService
  ) {}

  /**
   * 系统配置分页列表
   */
  async getConfigPage(query: ConfigPageQueryDto) {
    const { configName, configKey, pageNum, pageSize } = query;

    const whereConditions: any = { isDeleted: 0 };

    if (configName) {
      whereConditions.configName = Like(`%${configName}%`);
    }

    if (configKey) {
      whereConditions.configKey = Like(`%${configKey}%`);
    }

    const [list, total] = await this.configRepository.findAndCount({
      where: whereConditions,
      order: { createTime: "DESC" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    });

    return {
      list,
      total,
    };
  }

  /**
   * 新增系统配置
   */
  async saveConfig(formData: CreateConfigDto) {
    // 检查配置键是否已存在
    const existingConfig = await this.configRepository.findOne({
      where: { configKey: formData.configKey, isDeleted: 0 },
    });

    if (existingConfig) {
      throw new BadRequestException("配置键已存在");
    }

    const config = this.configRepository.create({
      ...formData,
      createTime: new Date(),
    });

    await this.configRepository.save(config);

    // 刷新缓存
    await this.refreshCache();

    return true;
  }

  /**
   * 获取系统配置表单数据
   */
  async getConfigFormData(id: number) {
    const config = await this.configRepository.findOne({
      where: { id, isDeleted: 0 },
    });

    if (!config) {
      throw new NotFoundException("配置不存在");
    }

    return config;
  }

  /**
   * 修改系统配置
   */
  async updateConfig(id: number, formData: UpdateConfigDto) {
    const config = await this.configRepository.findOne({
      where: { id, isDeleted: 0 },
    });

    if (!config) {
      throw new NotFoundException("配置不存在");
    }

    // 如果修改了配置键，检查是否与其他配置冲突
    if (formData.configKey && formData.configKey !== config.configKey) {
      const existingConfig = await this.configRepository.findOne({
        where: { configKey: formData.configKey, isDeleted: 0 },
      });

      if (existingConfig && existingConfig.id !== id) {
        throw new BadRequestException("配置键已存在");
      }
    }

    Object.assign(config, formData);
    config.updateTime = new Date();

    await this.configRepository.save(config);

    // 刷新缓存
    await this.refreshCache();

    return true;
  }

  /**
   * 删除系统配置
   */
  async deleteConfig(id: number) {
    const config = await this.configRepository.findOne({
      where: { id, isDeleted: 0 },
    });

    if (!config) {
      throw new NotFoundException("配置不存在");
    }

    config.isDeleted = 1;
    await this.configRepository.save(config);

    // 刷新缓存
    await this.refreshCache();

    return true;
  }

  /**
   * 刷新系统配置缓存
   */
  async refreshCache() {
    const configs = await this.configRepository.find({
      where: { isDeleted: 0 },
    });

    const configMap = {};
    configs.forEach((config) => {
      configMap[config.configKey] = config.configValue;
    });

    // 存储到 Redis
    await this.redisService.set("sys:config:all", JSON.stringify(configMap), 3600);

    return true;
  }

  /**
   * 根据配置键获取配置值
   */
  async getConfigValue(configKey: string): Promise<string | null> {
    // 先从缓存获取
    const cacheData = await this.redisService.get("sys:config:all");
    if (cacheData) {
      const configMap = JSON.parse(cacheData);
      return configMap[configKey] || null;
    }

    // 缓存不存在，从数据库获取
    const config = await this.configRepository.findOne({
      where: { configKey, isDeleted: 0 },
    });

    return config ? config.configValue : null;
  }
}
