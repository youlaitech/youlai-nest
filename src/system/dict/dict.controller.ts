import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { DictService } from "./dict.service";
import { DictFormDto } from "./dto/create-dict.dto";
import { UpdateDictDto } from "./dto/update-dict.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { IsCreateBy, IsUpdateBy } from "../../common/public/public.decorator";
import { CreateDictItemDto } from "./dto/create-dict-item.dto";

@ApiTags("06.字典接口")
@Controller("dict")
export class DictController {
  constructor(private readonly dictService: DictService) {}

  //---------------------------------------------------
  // 字典相关接口
  //---------------------------------------------------
  @ApiOperation({ summary: "字典分页列表" })
  @Get("page")
  async getDictPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("name") keywords: string
  ) {
    return await this.dictService.getDictPage(pageNum, pageSize, keywords);
  }

  @ApiOperation({ summary: "新增字典" })
  @IsCreateBy()
  @Post()
  createDict(@Req() request, @Body() dictForm: DictFormDto) {
    return this.dictService.createDict({
      ...dictForm,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "字典表单数据" })
  @Get(":id/form")
  getDictForm(@Param("id") id: string) {
    return this.dictService.getDictForm(id);
  }

  @ApiOperation({ summary: "修改字典" })
  @Put(":id")
  async updateDict(@Param("id") id: string, @Body() updateDictDto: UpdateDictDto) {
    return await this.dictService.updateDict(id, updateDictDto);
  }

  @ApiOperation({ summary: "删除字典" })
  @IsUpdateBy()
  @Delete(":ids")
  async deleteDict(@Body() body, @Param("ids") ids: string) {
    const idArray = ids.split(",");

    for (const id of idArray) {
      const success = await this.dictService.deleteDict(id, body.updateBy, body.updateTime);
      if (!success) {
        throw new HttpException(
          `Failed to delete department with ID: ${id}`,
          HttpStatus.BAD_REQUEST
        );
      }
    }
    return "操作成功";
  }

  //---------------------------------------------------
  // 字典项相关接口
  //---------------------------------------------------
  @ApiOperation({ summary: "字典项分页列表" })
  @Get("page")
  async getDictDataPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Query("dictCode") dictCode: string,
    @Query("keywords") keywords?: string
  ) {
    return await this.dictService.getDictItemPage(pageNum, pageSize, dictCode, keywords);
  }

  @ApiOperation({ summary: "新增字典项" })
  @IsCreateBy()
  @Post()
  async createDictData(@Req() request, @Body() createDictItemDto: CreateDictItemDto) {
    return await this.dictService.createDictData({
      ...createDictItemDto,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "字典项表单数据" })
  @Get(":id/form")
  async getDictItemForm(@Param("id") id: string) {
    return await this.dictService.getDictItemForm(id);
  }

  @ApiOperation({ summary: "更新字典项" })
  @IsUpdateBy()
  @Put(":id")
  async updateDictData(@Param("id") id: string, @Body() updateData: any) {
    return await this.dictService.updateDictItem(id, updateData);
  }

  @ApiOperation({ summary: "删除字典项" })
  @IsUpdateBy()
  @Delete(":id")
  async deleteDictData(@Param("id") id: string) {
    return await this.dictService.deleteDictItems(id);
  }
}
