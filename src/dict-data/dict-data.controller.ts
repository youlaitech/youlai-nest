import { Controller, Get, Query, Param, Put, Body, Delete, Post, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DictService } from "../dict/dict.service";
import { IsUpdateBy, IsCreateBy } from "../common/public/public.decorator";
import { CreateDictDataDto } from "./dto/create-dict-data.dto";

@ApiTags("字典数据")
@Controller("dict-data")
export class DictDataController {
  constructor(private readonly dictService: DictService) {}

  @ApiOperation({ summary: "字典数据分页查询" })
  @Get("page")
  async getDictDataPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("dictCode") dictCode: string,
    @Query("keywords") keywords?: string
  ) {
    return await this.dictService.findDictDataPage(pageNum, pageSize, dictCode, keywords);
  }

  @ApiOperation({ summary: "新增字典数据" })
  @IsCreateBy()
  @Post()
  async createDictData(@Req() request, @Body() createDictDataDto: CreateDictDataDto) {
    return await this.dictService.createDictData({
      ...createDictDataDto,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "获取字典表单数据" })
  @Get(":id/form")
  async getDictDataForm(@Param("id") id: string) {
    return await this.dictService.findDictDataById(id);
  }

  @ApiOperation({ summary: "更新字典数据" })
  @IsUpdateBy()
  @Put(":id")
  async updateDictData(@Param("id") id: string, @Body() updateData: any) {
    return await this.dictService.updateDictData(id, updateData);
  }

  @ApiOperation({
    summary: "删除字典数据",
  })
  @IsUpdateBy()
  @Delete(":id")
  async deleteDictData(
    @Param("id") id: string,
    @Body() body: { updateBy: string; updateTime: number }
  ) {
    return await this.dictService.removeDictData(id, body.updateBy, body.updateTime);
  }
}
