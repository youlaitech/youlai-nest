import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NoticeService } from "./notice.service";
import { NoticePageQueryDto } from "./dto/notice-page-query.dto";
import { CreateNoticeDto, UpdateNoticeDto } from "./dto/notice-form.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

@ApiTags("09.通知公告")
@Controller("notices")
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) {}

  @ApiOperation({ summary: "通知公告分页列表" })
  @Get("page")
  async getNoticePage(@Query() query: NoticePageQueryDto) {
    return await this.noticeService.getNoticePage(query);
  }

  @ApiOperation({ summary: "新增通知公告" })
  @Post()
  async saveNotice(
    @CurrentUser("userId") currentUserId: number,
    @Body() formData: CreateNoticeDto
  ) {
    await this.noticeService.saveNotice({ ...formData, createBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "获取通知公告表单数据" })
  @Get(":id/form")
  async getNoticeForm(@Param("id") id: number) {
    return await this.noticeService.getNoticeFormData(id);
  }

  @ApiOperation({ summary: "阅读获取通知公告详情" })
  @Get(":id/detail")
  async getNoticeDetail(@Param("id") id: number) {
    return await this.noticeService.getNoticeDetail(id);
  }

  @ApiOperation({ summary: "修改通知公告" })
  @Put(":id")
  async updateNotice(
    @Param("id") id: number,
    @CurrentUser("userId") currentUserId: number,
    @Body() formData: UpdateNoticeDto
  ) {
    await this.noticeService.updateNotice(id, { ...formData, updateBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "发布通知公告" })
  @Put(":id/publish")
  async publishNotice(@Param("id") id: number, @CurrentUser("userId") currentUserId: number) {
    await this.noticeService.publishNotice(id, currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "撤回通知公告" })
  @Put(":id/revoke")
  async revokeNotice(@Param("id") id: number) {
    await this.noticeService.revokeNotice(id);
    return { success: true };
  }

  @ApiOperation({ summary: "删除通知公告" })
  @Delete(":ids")
  async deleteNotices(@Param("ids") ids: string) {
    const idArray = ids.split(",").map((v) => Number(v));
    await this.noticeService.deleteNotices(idArray);
    return { success: true };
  }

  @ApiOperation({ summary: "全部已读" })
  @Put("read-all")
  async readAll(@CurrentUser("userId") currentUserId: number) {
    await this.noticeService.readAll(currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "获取我的通知公告分页列表" })
  @Get("my")
  async getMyNoticePage(
    @CurrentUser("userId") currentUserId: number,
    @Query() query: NoticePageQueryDto
  ) {
    return await this.noticeService.getMyNoticePage(currentUserId, query);
  }
}
