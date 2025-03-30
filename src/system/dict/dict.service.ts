import { Injectable, NotFoundException } from "@nestjs/common";
import { DictFormDto } from "./dto/create-dict.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Dict, DictItem } from "./dict.schema";
import { BusinessException } from "../../common/exceptions/business.exception";
import { UpdateDictDto } from "./dto/update-dict.dto";
import { CreateDictItemDto } from "./dto/create-dict-item.dto";

/**
 * 字典服务
 */
@Injectable()
export class DictService {
  constructor(
    @InjectModel(Dict.name)
    private readonly dictModel: Model<Dict>,
    @InjectModel(DictItem.name)
    private readonly dictItemModel: Model<DictItem>
  ) {}

  /**
   * 字典分页列表
   */
  async getDictPage(pageNum: number, pageSize: number, keywords: string) {
    const query: any = { isDeleted: 0 };
    if (keywords) {
      query.$or = [
        { name: { $regex: new RegExp(keywords, "i") } },
        { dict_code: { $regex: new RegExp(keywords, "i") } },
      ];
    }

    const [dicts, total] = await Promise.all([
      this.dictModel
        .find(query)
        .select("name dictCode status")
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .sort({ createTime: -1 })
        .lean()
        .exec(),
      this.dictModel.countDocuments(query).exec(),
    ]);

    // 转换返回结果格式
    const result = dicts.map((dict) => ({
      id: dict._id,
      name: dict.name,
      dictCode: dict.dictCode,
      status: dict.status,
    }));

    return { list: result, total };
  }

  /**
   * 创建字典
   *
   * @param dictFormDto
   * @returns
   */
  async createDict(dictFormDto: DictFormDto) {
    const { dictCode, name, status } = dictFormDto;
    const existCode = await this.dictModel.find({ dictCode, isDeleted: 0 });
    if (existCode.length > 0) {
      throw new BusinessException("字典已存在");
    }
    const newDict = await this.dictModel.create({
      dictCode,
      name,
      status,
    });

    return await newDict.save();
  }

  /**
   * 获取字典表单
   *
   * @param id
   * @returns
   */
  async getDictForm(id: string) {
    const dict = await this.dictModel.findById(id).lean().exec();
    if (!dict) {
      throw new BusinessException("字典不存在");
    }
    return {
      id: dict._id,
      name: dict.name,
      dictCode: dict.dictCode,
      status: dict.status,
    };
  }

  /**
   * 更新字典
   *
   * @param id
   * @param updateDictDto
   * @returns
   */
  async updateDict(id: string, updateDictDto: UpdateDictDto) {
    return await this.dictModel.findByIdAndUpdate(id, updateDictDto, { new: true }).exec();
  }

  /**
   * 删除字典
   *
   * @param id
   * @returns
   */
  async deleteDict(id: string, updateBy: string, updateTime: number) {
    const dict = await this.dictModel.findById(id);

    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    await this.dictModel.findByIdAndUpdate(id, {
      isDeleted: 1,
      updateBy,
      updateTime,
    });
    return true;
  }

  //---------------------------------------------------
  // 字典项相关接口
  //---------------------------------------------------

  /**
   * 字典数据分页列表
   *
   * @param pageNum
   * @param pageSize
   * @param dictCode
   * @param keywords
   * @returns
   */
  async getDictItemPage(pageNum: number, pageSize: number, dictCode: string, keywords?: string) {
    // 构建查询条件
    const query: any = {
      dictCode: dictCode,
      isDeleted: 0,
    };

    // 如果有关键词，添加名称或值的模糊查询
    if (keywords) {
      query.$or = [
        { name: { $regex: new RegExp(keywords, "i") } },
        { value: { $regex: new RegExp(keywords, "i") } },
      ];
    }

    // 查询字典项总数
    const total = await this.dictItemModel.countDocuments(query);

    // 查询字典项
    const dictData = await this.dictItemModel
      .find(query)
      .sort({ sort: 1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // 格式化返回数据
    const result = dictData.map((item) => ({
      id: item._id,
      dictCode: dictCode,
      label: item.label,
      value: item.value,
      sort: item.sort,
      status: item.status,
      tagType: item.tagType,
    }));

    return {
      list: result,
      total,
    };
  }

  /**
   * 字典项列表
   *
   * @param dictCode 字典编码
   * @returns
   */
  async getDictItems(dictCode: string) {
    const dictItems = await this.dictItemModel
      .find({
        dictCode: dictCode,
        isDeleted: 0,
      })
      .sort({ sort: 1 })
      .lean();
    console.log("获取字典项列表", dictCode, dictItems);

    const result = dictItems.map((item) => ({
      label: item.label,
      value: item.value,
      tagType: item.tagType,
    }));

    return result;
  }

  /**
   * 创建字典项
   *
   * @param createDictItemDto
   * @returns
   */
  async createDictItem(createDictItemDto: CreateDictItemDto) {
    const { dictCode, label, value, sort, status, tagType, createBy, createTime, deptTreePath } =
      createDictItemDto;

    // 查找对应的字典
    const dict = await this.dictModel.findOne({
      dict_code: dictCode,
      isDeleted: 0,
    });
    if (!dict) {
      throw new BusinessException("字典不存在");
    }

    // 检查值是否已存在
    const existItem = await this.dictItemModel.findOne({
      dictId: dict._id,
      value,
      isDeleted: 0,
    });
    if (existItem) {
      throw new BusinessException(`字典项值 "${value}" 已存在`);
    }

    // 创建新的字典项
    const newDictItem = new this.dictItemModel({
      dictId: dict._id,
      name: label,
      value,
      sort,
      status,
      tagType,
      createBy,
      createTime,
      deptTreePath,
    });

    // 保存字典项
    const savedDictItem = await newDictItem.save();

    return {
      id: savedDictItem._id,
      dictCode,
      label: savedDictItem.label,
      value: savedDictItem.value,
      sort: savedDictItem.sort,
      status: savedDictItem.status,
      tagType: savedDictItem.tagType,
    };
  }

  /**
   * 字典项表单数据
   *
   * @param id
   * @returns
   */
  async getDictItemForm(id: string) {
    const dictItem = await this.dictItemModel.findById(id).lean();
    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    return {
      id: dictItem._id,
      dictCode: dictItem.dictCode,
      label: dictItem.label,
      value: dictItem.value,
      sort: dictItem.sort,
      status: dictItem.status,
    };
  }

  /**
   * 更新字典项
   *
   * @param id
   * @param updateData
   * @returns
   */
  async updateDictItem(id: string, updateData: any) {
    const dictItem = await this.dictItemModel.findById(id);
    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    // 检查值是否已存在
    const existItem = await this.dictItemModel.findOne({
      dictCode: dictItem.dictCode,
      value: updateData.value,
      isDeleted: 0,
      _id: { $ne: id },
    });
    if (existItem) {
      throw new BusinessException(`字典项值 "${updateData.value}" 已存在`);
    }

    // 更新字典项
    await this.dictItemModel.findByIdAndUpdate(id, updateData, { new: true });

    return true;
  }

  /**
   * 删除字典项
   *
   * @param id
   * @returns
   */
  async deleteDictItems(id: string) {
    const dictItem = await this.dictItemModel.findById(id);
    if (!dictItem) {
      throw new BusinessException("字典项不存在");
    }

    await this.dictItemModel.findByIdAndUpdate(
      id,
      {
        isDeleted: 1,
      },
      { new: true }
    );

    return true;
  }
}
