import { Injectable, NotFoundException } from "@nestjs/common";
import { DictFormDto } from "./dto/create-dict.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Dict } from "./dict.schema";
import { ApiException } from "../../common/http-exception/api.exception";
import { BusinessErrorCode } from "../../common/enums/business-error-code.enum";
import { UpdateDictDto } from "./dto/update-dict.dto";

/**
 * 字典服务
 */
@Injectable()
export class DictService {
  constructor(
    @InjectModel(Dict.name)
    private readonly dictModel: Model<Dict>
  ) {}

  async create(dictFormDto: DictFormDto) {
    try {
      const { dict_code, name, status, deptTreePath, createBy, createTime } = dictFormDto;
      const existCode = await this.dictModel.find({ dict_code, isDeleted: 0 });
      if (existCode.length > 0) {
        throw new ApiException("字典已存在", BusinessErrorCode.DB_DUPLICATE_KEY);
      }
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

      return savedDict;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async findSearch(pageNum: number, pageSize: number, keywords: string) {
    // 创建查询条件 后面优化
    const query: any = { isDeleted: 0 };
    if (keywords) {
      query.$or = [
        { name: { $regex: new RegExp(keywords, "i") } },
        { dict_code: { $regex: new RegExp(keywords, "i") } },
      ];
    }

    // 查询所有字典并分页
    const [dicts, total] = await Promise.all([
      this.dictModel
        .find(query)
        .select("name dictCode status")
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
      dictCode: dict.dictCode,
      status: dict.status,
    }));

    return { list: result, total };
  }

  async findOne(id: string) {
    try {
      // 查询字典
      const dict = await this.dictModel.findById(id).lean().exec();
      if (!dict) {
        throw new ApiException("字典项没有找到", BusinessErrorCode.DB_QUERY_ERROR);
      }

      return {
        id: dict._id,
        name: dict.name,
        dictCode: dict.dictCode,
        status: dict.status,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async updateDict(id: string, updateData: DictFormDto) {
    try {
      const { dict_code, name, status, updateBy, updateTime } = updateData;

      // 更新字典信息
      const dict = await this.dictModel
        .findByIdAndUpdate(id, { dict_code, name, status, updateBy, updateTime }, { new: true })
        .exec();

      if (!dict) {
        throw new NotFoundException("字典未找到");
      }

      // 返回更新后的字典
      return this.findOne(id);
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async findDictList() {
    return null;
  }

  async update(id: string, updateDictDto: UpdateDictDto) {
    return await this.dictModel.findByIdAndUpdate(id, updateDictDto, { new: true }).exec();
  }

  async remove(id: string, updateBy: string, updateTime: number) {
    try {
      const dict = await this.dictModel.findById(id);

      if (!dict) {
        throw new NotFoundException("找不到对应的字典");
      }

      await this.dictModel.findByIdAndUpdate(id, {
        isDeleted: 1,
        updateBy,
        updateTime,
      });
      return true;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }
}
