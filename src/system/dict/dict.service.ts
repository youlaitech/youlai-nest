import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not } from "typeorm";
import { SysDict } from "./entities/sys-dict.entity";
import { SysDictItem } from "./entities/sys-dict-item.entity";
import { BusinessException } from "../../common/exceptions/business.exception";
import { DictFormDto } from "./dto/create-dict.dto";
import { UpdateDictDto } from "./dto/update-dict.dto";
import { CreateDictItemDto } from "./dto/create-dict-item.dto";
import { UpdateDictItemDto } from "./dto/update-dict-item.dto";

/**
 * 字典服务
 */
@Injectable()
export class DictService {
  constructor(
    @InjectRepository(SysDict)
    private readonly dictRepository: Repository<SysDict>,
    @InjectRepository(SysDictItem)
    private readonly dictItemRepository: Repository<SysDictItem>
  ) {}

  /**
   * 字典分页列表
   */
  async getDictPage(pageNum: number, pageSize: number, keywords: string) {
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const queryBuilder = this.dictRepository.createQueryBuilder("dict");
    queryBuilder.where("dict.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keywords) {
      queryBuilder.andWhere("(dict.name LIKE :keywords OR dict.dictCode LIKE :keywords)", {
        keywords: `%${keywords}%`,
      });
    }

    const [dicts, total] = await queryBuilder
      .select(["dict.id", "dict.name", "dict.dictCode", "dict.status"])
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .orderBy("dict.createTime", "DESC")
      .getManyAndCount();

    return {
      data: dicts,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  async getDictOptions() {
    const dicts = await this.dictRepository.find({
      where: { status: 0, isDeleted: 0 },
      order: { createTime: "DESC" },
      select: ["dictCode", "name"],
    });

    return dicts.map((d) => ({
      label: d.name,
      value: d.dictCode,
    }));
  }

  /**
   * 创建字典
   */
  async createDict(dictFormDto: DictFormDto) {
    const { dictCode, name, status } = dictFormDto;

    const existDict = await this.dictRepository.findOne({
      where: { dictCode, isDeleted: 0 },
    });

    if (existDict) {
      throw new BusinessException("字典已存在");
    }

    const dict = this.dictRepository.create({
      dictCode,
      name,
      status,
    });

    return await this.dictRepository.save(dict);
  }

  /**
   * 获取字典表单
   */
  async getDictForm(id: string | number) {
    const dict = await this.dictRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });

    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    return {
      id: dict.id,
      name: dict.name,
      dictCode: dict.dictCode,
      status: dict.status,
    };
  }

  /**
   * 更新字典
   */
  async updateDict(id: string | number, updateDictDto: UpdateDictDto) {
    const idStr = id.toString();
    const dict = await this.dictRepository.findOne({
      where: { id: idStr, isDeleted: 0 },
    });

    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    await this.dictRepository.update(idStr, {
      ...(updateDictDto as any),
      updateBy: updateDictDto.updateBy == null ? undefined : updateDictDto.updateBy.toString(),
    });
    return true;
  }

  /**
   * 删除字典
   */
  async deleteDict(id: string | number, updateBy: string | number) {
    const idStr = id.toString();
    const dict = await this.dictRepository.findOne({
      where: { id: idStr, isDeleted: 0 },
    });

    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    await this.dictRepository.update(idStr, {
      isDeleted: 1,
      updateBy: updateBy.toString() as any,
      updateTime: new Date(),
    });

    return true;
  }

  //---------------------------------------------------
  // 字典项相关接口
  //---------------------------------------------------

  /**
   * 字典数据分页列表
   */
  async getDictItemPage(pageNum: number, pageSize: number, dictCode: string, keywords?: string) {
    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const queryBuilder = this.dictItemRepository.createQueryBuilder("item");
    queryBuilder.where("item.dictCode = :dictCode", { dictCode });

    if (keywords) {
      queryBuilder.andWhere("(item.label LIKE :keywords OR item.value LIKE :keywords)", {
        keywords: `%${keywords}%`,
      });
    }

    const [items, total] = await queryBuilder
      .select([
        "item.id",
        "item.dictCode",
        "item.label",
        "item.value",
        "item.sort",
        "item.status",
        "item.tagType",
      ])
      .orderBy("item.sort", "ASC")
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .getManyAndCount();

    return {
      data: items,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  /**
   * 字典项列表
   */
  async getDictItems(dictCode: string) {
    const items = await this.dictItemRepository.find({
      where: {
        dictCode,
      },
      order: {
        sort: "ASC",
      },
      select: ["label", "value", "tagType"],
    });

    return items;
  }

  /**
   * 创建字典项
   */
  async createDictItem(createDictItemDto: CreateDictItemDto) {
    const { dictCode, label, value, sort, status, tagType } = createDictItemDto;

    // 检查字典是否存在
    const dict = await this.dictRepository.findOne({
      where: { dictCode, isDeleted: 0 },
    });

    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    // 检查值是否已存在
    const existItem = await this.dictItemRepository.findOne({
      where: { dictCode, value },
    });

    if (existItem) {
      throw new BusinessException(`字典项值 "${value}" 已存在`);
    }

    // 创建新的字典项
    const dictItem = this.dictItemRepository.create({
      dictCode,
      label,
      value,
      sort,
      status,
      tagType,
    });

    const savedItem = await this.dictItemRepository.save(dictItem);

    return {
      id: savedItem.id,
      dictCode,
      label: savedItem.label,
      value: savedItem.value,
      sort: savedItem.sort,
      status: savedItem.status,
      tagType: savedItem.tagType,
    };
  }

  /**
   * 字典项表单数据
   */
  async getDictItemForm(id: string | number) {
    const dictItem = await this.dictItemRepository.findOne({
      where: { id: id.toString() },
    });

    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    return {
      id: dictItem.id,
      dictCode: dictItem.dictCode,
      label: dictItem.label,
      value: dictItem.value,
      sort: dictItem.sort,
      status: dictItem.status,
    };
  }

  /**
   * 更新字典项
   */
  async updateDictItem(id: string | number, updateData: UpdateDictItemDto) {
    const idStr = id.toString();
    const dictItem = await this.dictItemRepository.findOne({
      where: { id: idStr },
    });

    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    // 检查值是否已存在
    if (updateData.value) {
      const existItem = await this.dictItemRepository.findOne({
        where: {
          dictCode: dictItem.dictCode,
          value: updateData.value,
          id: Not(idStr),
        },
      });

      if (existItem) {
        throw new BusinessException(`字典项值 "${updateData.value}" 已存在`);
      }
    }

    await this.dictItemRepository.update(idStr, {
      ...(updateData as any),
      updateBy: updateData.updateBy == null ? undefined : updateData.updateBy.toString(),
    });
    return true;
  }

  /**
   * 删除字典项
   */
  async deleteDictItems(id: string | number) {
    const dictItem = await this.dictItemRepository.findOne({
      where: { id: id.toString() },
    });

    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    await this.dictItemRepository.delete(id.toString());
    return true;
  }
}
