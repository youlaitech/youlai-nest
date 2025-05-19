import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  HttpException,
  HttpStatus,
  SetMetadata,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { DeptService } from "./dept.service";
import { CreateDeptDto } from "./dto/create-dept.dto";
import { UpdateDeptDto } from "./dto/update-dept.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";

@ApiTags("05.部门接口")
@Controller("dept")
export class DeptController {
  constructor(private readonly deptService: DeptService) {}

  @ApiOperation({ summary: "获取部门表格树形列表" })
  @Get()
  @SetMetadata("resource", "sys_dept")
  async findAll(@Query("keywords") keywords?: string, @Query("status") status?: string) {
    return await this.deptService.findAll(keywords, status);
  }

  @ApiOperation({ summary: "获取部门下拉树形列表" })
  @Get("options")
  @SetMetadata("resource", "sys_dept")
  async getOptions() {
    return await this.deptService.findAllOptions();
  }

  @ApiOperation({ summary: "创建部门" })
  @Post()
  async create(@CurrentUser("userId") currentUserId: number, @Body() createDeptDto: CreateDeptDto) {
    return await this.deptService.create({
      ...createDeptDto,
      createBy: currentUserId,
    });
  }

  @ApiOperation({ summary: "获取部门表单" })
  @Get(":id/form")
  async getDeptForm(@Param("id") id: number) {
    const dept = await this.deptService.getDeptForm(id);
    if (!dept) {
      throw new HttpException("部门不存在", HttpStatus.NOT_FOUND);
    }
    return dept;
  }

  @ApiOperation({ summary: "编辑部门" })
  @Put(":id")
  async update(
    @CurrentUser("userId") currentUserId: number,
    @Param("id") id: number,
    @Body() requestBody: any
  ) {
    // 只提取需要的字段
    const updateDeptDto: UpdateDeptDto = {
      name: requestBody.name,
      code: requestBody.code,
      parentId: Number(requestBody.parentId),
      sort: Number(requestBody.sort),
      status: Number(requestBody.status),
    };

    const result = await this.deptService.updateDept(id, {
      ...updateDeptDto,
      updateBy: currentUserId,
    });

    if (!result) {
      throw new HttpException("部门不存在", HttpStatus.NOT_FOUND);
    }
    return result;
  }

  @ApiOperation({ summary: "删除部门" })
  @Delete(":ids")
  async deleteDepartments(@Param("ids") ids: string) {
    const idArray = ids.split(",").map((id) => Number(id));

    for (const id of idArray) {
      const success = await this.deptService.deleteDept(id);
      if (!success) {
        throw new HttpException(`删除部门失败，ID: ${id}`, HttpStatus.BAD_REQUEST);
      }
    }
    return { message: "部门删除成功" };
  }
}
