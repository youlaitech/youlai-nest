import { Injectable, NotFoundException } from '@nestjs/common';
import { DictFormDto } from './dto/create-dict.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DictItems, Dicts } from './schemas/dict.schemas';
import { ApiException } from '../common/http-exception/api.exception';
import { ApiErrorCode } from '../common/enums/api-error-code.enum';
import { UpdateDictDto } from './dto/update-dict.dto';

@Injectable()
export class DictService {
  constructor(
    @InjectModel('Dicts') private readonly dictModel: Model<Dicts>,
    @InjectModel('DictItems') private readonly dictItemModel: Model<DictItems>,
  ) {}

  async create(dictFormDto: DictFormDto) {
    try {
      const {
        code,
        name,
        status,
        dictItems,
        deptTreePath,
        createBy,
        createTime,
      } = dictFormDto;
      const existCode = await this.dictModel.find({ code, isDeleted: 0 });
      if (existCode.length > 0)
        throw new ApiException('字典已存在', ApiErrorCode.USER_EXIST);
      const newDict = await this.dictModel.create({
        code,
        name,
        status,
        deptTreePath,
        createBy,
        createTime,
      });
      // 保存字典信息
      const savedDict = await newDict.save();

      // 如果有字典项，则并行检查和保存
      if (dictItems && dictItems.length > 0) {
        await Promise.all(
          dictItems.map(async (item) => {
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
                ApiErrorCode.USER_EXIST,
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
        ApiErrorCode.DATABASE_ERROR,
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
        { code: { $regex: new RegExp(keywords, 'i') } },
      ];
    }

    // 查询所有字典并分页
    const [dicts, total] = await Promise.all([
      this.dictModel
        .find(query)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .sort({ createdAt: -1 }) // 按照创建时间降序排序
        .lean()
        .exec(),
      this.dictModel.countDocuments(query).exec(),
    ]);
    // 查询所有字典项
    const dictItems = await this.dictItemModel
      .find({ isDeleted: 0 })
      .lean()
      .exec();

    // 构建一个字典项数据的索引，以便快速查找
    const dictItemsMap: { [key: string]: DictItems[] } = dictItems.reduce(
      (map, item) => {
        const dictIdStr = item.dictId.toString(); // 转换 ObjectId 为字符串
        if (!map[dictIdStr]) {
          map[dictIdStr] = [];
        }
        map[dictIdStr].push({
          id: item._id,
          name: item.name,
          value: item.value,
          sort: item.sort,
          status: item.status,
        });
        return map;
      },
      {},
    );

    // 关联字典项到字典
    const result = dicts.map((dict) => ({
      id: dict._id,
      name: dict.name,
      code: dict.code,
      status: dict.status,
      dictItems: dictItemsMap[dict._id.toString()] || [],
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
          { code: { $regex: new RegExp(keywords, 'i') } },
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
        throw new ApiException('字典项没有找到', ApiErrorCode.USER_EXIST);
      }

      // 查询字典项
      const dictItems = await this.dictItemModel
        .find({ dictId: id })
        .lean()
        .exec();
      return {
        id: dict._id,
        name: dict.name,
        code: dict.code,
        status: dict.status,
        dictItems: dictItems.map((item) => ({
          id: item._id,
          name: item.name,
          value: item.value,
          sort: item.sort,
          status: item.status,
        })),
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        ApiErrorCode.DATABASE_ERROR,
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
        code,
        name,
        status,
        dictItems = [],
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
          { code, name, status, updateBy, updateTime },
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
      dictItems.forEach((item) => {
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
      const receivedDictItemIds = dictItems
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
        ApiErrorCode.DATABASE_ERROR,
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
        ApiErrorCode.DATABASE_ERROR,
      );
    }
  }
}
