import { Controller, Get, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { GenService } from "./gen.service";
import { CreateGenDto } from "./dto/create-gen.dto";
import { UpdateGenDto } from "./dto/update-gen.dto";
import { Public } from "../common/public/public.decorator";

@Controller("gen")
export class GenController {
  constructor(private readonly genService: GenService) {}

  // 创建集合并插入数据
  @Post("create")
  @Public()
  async createCollection(@Body() body: { collectionName: string; schema: any; data: any }) {
    console.log(body, "body");
    return this.genService.createCollectionAndInsertData(
      body.collectionName,
      body.schema,
      body.data
    );
  }

  // 获取指定集合的数据
  @Get(":collectionName")
  @Public()
  async getData(@Param("collectionName") collectionName: string) {
    return this.genService.getDataFromCollection(collectionName);
  }
  @Post()
  create(@Body() createGenDto: CreateGenDto) {
    return this.genService.create(createGenDto);
  }

  @Get()
  findAll() {
    return this.genService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.genService.findOne(+id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateGenDto: UpdateGenDto) {
    return this.genService.update(+id, updateGenDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.genService.remove(+id);
  }
}
