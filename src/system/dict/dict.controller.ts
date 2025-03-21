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
@Controller("dicts")
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
  @Get(":dictCode/items/page")
  async getDictDataPage(
    @Query("pageNum") pageNum: number,
    @Query("pageSize") pageSize: number,
    @Param("dictCode") dictCode: string,
    @Query("keywords") keywords?: string
  ) {
    return await this.dictService.getDictItemPage(pageNum, pageSize, dictCode, keywords);
  }

  @ApiOperation({ summary: "字典项列表" })
  @Get(":dictCode/items")
  async getDictItems(@Param("dictCode") dictCode: string) {
    return await this.dictService.getDictItems(dictCode);
  }

  @ApiOperation({ summary: "新增字典项" })
  @IsCreateBy()
  @Post(":dictCode/items")
  async createDictItem(@Req() request, @Body() createDictItemDto: CreateDictItemDto) {
    return await this.dictService.createDictItem({
      ...createDictItemDto,
      createBy: request["user"]?.userId,
      deptTreePath: request["user"]?.deptTreePath || "0",
    });
  }

  @ApiOperation({ summary: "字典项表单数据" })
  @Get(":dictCode/items/:itemId/form")
  async getDictItemForm(@Param("itemId") itemId: string) {
    return await this.dictService.getDictItemForm(itemId);
  }

  @ApiOperation({ summary: "更新字典项" })
  @IsUpdateBy()
  @Put(":dictCode/items/:itemId")
  async updateDictData(@Param("itemId") itemId: string, @Body() updateData: any) {
    return await this.dictService.updateDictItem(itemId, updateData);
  }

  @ApiOperation({ summary: "删除字典项" })
  @IsUpdateBy()
  @Delete(":dictCode/items/:itemIds")
  async deleteDictData(@Param("itemIds") itemIds: string) {
    return await this.dictService.deleteDictItems(itemIds);
  }
}
