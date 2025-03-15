import { Injectable, NotFoundException } from '@nestjs/common';
import { DictFormDto } from './dto/create-dict.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DictData, Dicts } from './schemas/dict.schemas';
import { ApiException } from '../common/http-exception/api.exception';
import { BusinessErrorCode } from '../common/enums/business-error-code.enum';
import { UpdateDictDto } from './dto/update-dict.dto';
import { CreateDictDataDto } from './dto/create-dict-data.dto'; // <--- Add this line

@Injectable()
export class DictService {
  constructor(
    @InjectModel('Dicts') private readonly dictModel: Model<Dicts>,
    @InjectModel('DictData') private readonly dictItemModel: Model<DictData>,
  ) {}

  async create(dictFormDto: DictFormDto) {
    try {
      const {
        dict_code,
        name,
        status,
        dictData,
        deptTreePath,
        createBy,
        createTime,
      } = dictFormDto;
      const existCode = await this.dictModel.find({ dict_code, isDeleted: 0 });
      if (existCode.length > 0)
        throw new ApiException(
          '字典已存在',
          BusinessErrorCode.DB_DUPLICATE_KEY,
        );
      const newDict = await this.dictModel.create({
        dict_code,
        name,
        status,
        deptTreePath,
        createBy,
        createTime,
      });
      // 保存字典信息
      const savedDict = await newDict.save();

      // 如果有字典项，则并行检查和保存
      if (dictData && dictData.length > 0) {
        await Promise.all(
          dictData.map(async (item) => {
            const { name, value, sort, status } = item;
            // 检查字典项的唯一性（如名称或值是否已存在）
            const existItem = await this.dictItemModel.findOne({
              dictId: savedDict._id,
              isDeleted: 0,
              value,
            });
            if (existItem) {
              throw new ApiException(
                `字典项值 "${value}" 已存在`,
                BusinessErrorCode.DB_DUPLICATE_KEY,
              );
            }

            // 创建新的字典项
            const newDictItem = new this.dictItemModel({
              dictId: savedDict._id, // 关联字典 ID
              name,
              value,
              sort,
              status,
              deptTreePath,
              createBy,
              createTime,
            });
            // 保存字典项
            await newDictItem.save();
          }),
        );
      }
      return savedDict;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  findAll() {
    return `This action returns all dict`;
  }
  async findSearch(pageNum: number, pageSize: number, keywords: string) {
    // 创建查询条件 后面优化
    const query: any = { isDeleted: 0 };
    if (keywords) {
      query.$or = [
        { name: { $regex: new RegExp(keywords, 'i') } },
        { dict_code: { $regex: new RegExp(keywords, 'i') } },
      ];
    }

    // 查询所有字典并分页
    const [dicts, total] = await Promise.all([
      this.dictModel
        .find(query)
        .select('name dict_code status')
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .sort({ createTime: -1 }) // 按照创建时间降序排序
        .lean()
        .exec(),
      this.dictModel.countDocuments(query).exec(),
    ]);

    // 转换返回结果格式
    const result = dicts.map((dict) => ({
      id: dict._id,
      name: dict.name,
      dictCode: dict.dict_code,
      status: dict.status,
    }));

    return { list: result, total };
  }
  async findTypeSearch(pageNum: number, pageSize: number, keywords: string) {
    let query = {};

    // 添加关键词查询条件
    if (keywords) {
      query = {
        $or: [
          { name: { $regex: new RegExp(keywords, 'i') } },
          { dict_code: { $regex: new RegExp(keywords, 'i') } },
        ],
        isDeleted: 0,
      };
    }

    // 执行查询并分页
    const results = await this.dictModel
      .find(query, { dictItem: 0 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .exec();

    const total = await this.dictModel.countDocuments(query).exec();
    return { list: results, total };
  }

  async findOne(id: string) {
    try {
      // 查询字典
      const dict = await this.dictModel.findById(id).lean().exec();
      if (!dict) {
        throw new ApiException(
          '字典项没有找到',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
      }

      return {
        id: dict._id,
        name: dict.name,
        dictCode: dict.dict_code,
        status: dict.status,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }
  async findOptions(typeCode: string) {
    const results = await this.dictItemModel
      .find({ typeCode }, { name: 1, value: 1 })
      .sort({ sort: 'asc' })
      .exec();
    const options = results.map((result) => {
      return {
        label: result.name,
        value: result.value,
      };
    });

    return options;
  }
  async updateDict(id: string, updateData: DictFormDto) {
    try {
      const {
        dict_code,
        name,
        status,
        dictData = [],
        deptTreePath,
        createBy,
        updateBy,
        updateTime,
        createTime,
      } = updateData;

      // 更新字典信息
      const dict = await this.dictModel
        .findByIdAndUpdate(
          id,
          { dict_code, name, status, updateBy, updateTime },
          { new: true },
        )
        .exec();

      if (!dict) {
        throw new NotFoundException('字典未找到');
      }

      // 获取当前字典的所有字典项
      const existingDictItems = await this.dictItemModel
        .find({ dictId: id, isDeleted: 0 })
        .lean()
        .exec();
      const existingDictItemIds = existingDictItems.map((item) =>
        item._id.toString(),
      );

      // 构建批量操作的任务数组
      const bulkOps = [];

      // 遍历并处理传入的字典项
      dictData.forEach((item) => {
        if (item.id) {
          // 更新已有字典项
          bulkOps.push({
            updateOne: {
              filter: { _id: item.id },
              update: { ...item, updateBy, updateTime },
            },
          });
        } else {
          // 创建新字典项
          bulkOps.push({
            insertOne: {
              document: {
                ...item,
                deptTreePath,
                createTime,
                createBy,
                dictId: id,
              },
            },
          });
        }
      });

      // 查找需要删除的字典项ID并添加到批量操作中
      const receivedDictItemIds = dictData
        .map((item) => item.id)
        .filter(Boolean); // 过滤出接收到的字典项ID
      const dictItemsToDelete = existingDictItemIds.filter(
        (existingId) => !receivedDictItemIds.includes(existingId),
      );

      if (dictItemsToDelete.length) {
        bulkOps.push({
          updateMany: {
            filter: { _id: { $in: dictItemsToDelete } },
            update: { isDeleted: 1, updateBy, updateTime },
          },
        });
      }

      // 执行批量操作
      if (bulkOps.length) {
        await this.dictItemModel.bulkWrite(bulkOps);
      }

      // 返回更新后的字典及其字典项
      return this.findOne(id);
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async findDictList() {
    const dictTypes = await this.dictModel
      .find({ isDeleted: 0 })
      .select('name dict_code')
      .lean();

    const result = await Promise.all(
      dictTypes.map(async (dict) => {
        const dictData = await this.dictItemModel
          .find({ dictId: dict._id, isDeleted: 0, status: 1 })
          .select('value name tagType -_id')
          .sort({ sort: 1 })
          .lean();

        return {
          name: dict.name,
          dictCode: dict.dict_code,
          dictDataList: dictData.map((item) => ({
            value: item.value,
            label: item.name,
            tagType: item.tagType || 'info', // 默认使用info类型
          })),
        };
      }),
    );

    return result;
  }

  async findDictDataPage(
    pageNum: number,
    pageSize: number,
    dictCode: string,
    keywords?: string,
  ) {
    try {
      // 先查找对应的字典
      const dict = await this.dictModel.findOne({
        dict_code: dictCode,
        isDeleted: 0,
      });
      if (!dict) {
        throw new ApiException('字典不存在', BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 构建查询条件
      const query: any = {
        dictId: dict._id,
        isDeleted: 0,
      };

      // 如果有关键词，添加名称或值的模糊查询
      if (keywords) {
        query.$or = [
          { name: { $regex: new RegExp(keywords, 'i') } },
          { value: { $regex: new RegExp(keywords, 'i') } },
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
        label: item.name,
        value: item.value,
        sort: item.sort,
        status: item.status,
        tagType: item.tagType,
      }));

      return {
        list: result,
        total,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async updateItem(id: string, updateDictDto: UpdateDictDto) {
    return await this.dictItemModel
      .findByIdAndUpdate(id, updateDictDto, { new: true })
      .exec();
  }

  async update(id: string, updateDictDto: UpdateDictDto) {
    return await this.dictModel
      .findByIdAndUpdate(id, updateDictDto, { new: true })
      .exec();
  }

  async removeItem(id: string) {
    return await this.dictItemModel.findByIdAndDelete(id).exec();
  }

  async remove(id: string, updateBy: string, updateTime: number) {
    try {
      const dict = await this.dictModel.findById(id);

      if (!dict) {
        throw new NotFoundException('找不到对应的字典');
      }

      await this.dictModel.findByIdAndUpdate(id, {
        isDeleted: 1,
        updateBy,
        updateTime,
      });
      await this.dictItemModel.updateMany(
        { dictId: id },
        { isDeleted: 1, updateBy, updateTime },
      );
      return true;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async findDictDataById(id: string) {
    try {
      const dictItem = await this.dictItemModel.findById(id).lean();
      if (!dictItem) {
        throw new ApiException(
          '字典数据不存在',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
      }

      // 查找对应的字典类型
      const dict = await this.dictModel.findById(dictItem.dictId).lean();
      if (!dict) {
        throw new ApiException(
          '字典类型不存在',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
      }

      return {
        id: dictItem._id,
        dictCode: dict.dict_code,
        label: dictItem.name,
        value: dictItem.value,
        sort: dictItem.sort,
        status: dictItem.status,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async updateDictData(id: string, updateData: any) {
    try {
      const dictItem = await this.dictItemModel.findById(id);
      if (!dictItem) {
        throw new ApiException(
          '字典数据不存在',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
      }

      // 更新字典项
      const updatedDictItem = await this.dictItemModel.findByIdAndUpdate(
        id,
        {
          name: updateData.label,
          value: updateData.value,
          sort: updateData.sort,
          status: updateData.status,
          updateBy: updateData.updateBy,
          updateTime: updateData.updateTime,
        },
        { new: true },
      );

      return updatedDictItem;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async removeDictData(id: string, updateBy: string, updateTime: number) {
    try {
      const dictItem = await this.dictItemModel.findById(id);
      if (!dictItem) {
        throw new ApiException(
          '字典数据不存在',
          BusinessErrorCode.DB_QUERY_ERROR,
        );
      }

      // 软删除字典项
      await this.dictItemModel.findByIdAndUpdate(
        id,
        {
          isDeleted: 1,
          updateBy,
          updateTime,
        },
        { new: true },
      );

      return true;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }

  async createDictData(createDictDataDto: CreateDictDataDto) {
    try {
      const {
        dictCode,
        label,
        value,
        sort,
        status,
        tagType,
        createBy,
        createTime,
        deptTreePath,
      } = createDictDataDto;

      // 查找对应的字典
      const dict = await this.dictModel.findOne({
        dict_code: dictCode,
        isDeleted: 0,
      });
      if (!dict) {
        throw new ApiException('字典不存在', BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 检查值是否已存在
      const existItem = await this.dictItemModel.findOne({
        dictId: dict._id,
        value,
        isDeleted: 0,
      });
      if (existItem) {
        throw new ApiException(
          `字典项值 "${value}" 已存在`,
          BusinessErrorCode.DB_DUPLICATE_KEY,
        );
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
        label: savedDictItem.name,
        value: savedDictItem.value,
        sort: savedDictItem.sort,
        status: savedDictItem.status,
        tagType: savedDictItem.tagType,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR,
      );
    }
  }
}
