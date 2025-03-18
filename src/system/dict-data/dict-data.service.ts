import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Dict } from "../dict/dict.schema";
import { DictData } from "./dict-data.schema";
import { ApiException } from "../../common/http-exception/api.exception";
import { BusinessErrorCode } from "../../common/enums/business-error-code.enum";
import { CreateDictDataDto } from "./dto/create-dict-data.dto";

@Injectable()
export class DictDataService {
  constructor(
    @InjectModel(DictData.name)
    private readonly dictDataModel: Model<DictData>,
    @InjectModel(Dict.name)
    private readonly dictModel: Model<Dict>
  ) {}

  /**
   * 分页查询字典数据
   *
   * @param pageNum
   * @param pageSize
   * @param dictCode
   * @param keywords
   * @returns
   */
  async findDictDataPage(pageNum: number, pageSize: number, dictCode: string, keywords?: string) {
    try {
      // 先查找对应的字典
      const dict = await this.dictModel.findOne({
        dict_code: dictCode,
        isDeleted: 0,
      });
      if (!dict) {
        throw new ApiException("字典不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 构建查询条件
      const query: any = {
        dictId: dict._id,
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
      const total = await this.dictDataModel.countDocuments(query);

      // 查询字典项
      const dictData = await this.dictDataModel
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
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  /**
   * 根据ID查找字典数据
   *
   * @param id
   * @returns
   *
   */
  async findDictDataById(id: string) {
    try {
      const dictData = await this.dictDataModel.findById(id).lean();
      if (!dictData) {
        throw new ApiException("字典数据不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 查找字典编码对应的字典
      const dict = await this.dictModel.findOne({ code: dictData.dictCode }).lean();
      if (!dict) {
        throw new ApiException("字典不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      return {
        id: dictData._id,
        dictCode: dict.dictCode,
        label: dictData.label,
        value: dictData.value,
        sort: dictData.sort,
        status: dictData.status,
      };
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async updateDictData(id: string, updateData: any) {
    try {
      const dictItem = await this.dictDataModel.findById(id);
      if (!dictItem) {
        throw new ApiException("字典数据不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 更新字典项
      const updatedDictItem = await this.dictDataModel.findByIdAndUpdate(
        id,
        {
          name: updateData.label,
          value: updateData.value,
          sort: updateData.sort,
          status: updateData.status,
          updateBy: updateData.updateBy,
          updateTime: updateData.updateTime,
        },
        { new: true }
      );

      return updatedDictItem;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async removeDictData(id: string) {
    try {
      const dictItem = await this.dictDataModel.findById(id);
      if (!dictItem) {
        throw new ApiException("字典数据不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 软删除字典项
      await this.dictDataModel.findByIdAndUpdate(
        id,
        {
          isDeleted: 1,
        },
        { new: true }
      );

      return true;
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }

  async createDictData(createDictDataDto: CreateDictDataDto) {
    try {
      const { dictCode, label, value, sort, status, tagType, createBy, createTime, deptTreePath } =
        createDictDataDto;

      // 查找对应的字典
      const dict = await this.dictModel.findOne({
        dict_code: dictCode,
        isDeleted: 0,
      });
      if (!dict) {
        throw new ApiException("字典不存在", BusinessErrorCode.DB_QUERY_ERROR);
      }

      // 检查值是否已存在
      const existItem = await this.dictDataModel.findOne({
        dictId: dict._id,
        value,
        isDeleted: 0,
      });
      if (existItem) {
        throw new ApiException(`字典项值 "${value}" 已存在`, BusinessErrorCode.DB_DUPLICATE_KEY);
      }

      // 创建新的字典项
      const newDictItem = new this.dictDataModel({
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
    } catch (error) {
      throw new ApiException(
        error?.errorResponse?.errmsg || error?.errorResponse || error,
        BusinessErrorCode.DB_QUERY_ERROR
      );
    }
  }
}
