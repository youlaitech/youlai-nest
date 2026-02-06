import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NoticeService } from "./notice.service";
import { NoticeQueryDto } from "./dto/notice-query.dto";
import { CreateNoticeDto, UpdateNoticeDto } from "./dto/notice-form.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";

/**
 * 通知公告接口控制器
 */
@ApiTags("09.通知公告")
@Controller("notices")
export class NoticeController {
  private readonly noticeService: NoticeService;

  constructor(noticeService: NoticeService) {
    this.noticeService = noticeService;
  }

  @ApiOperation({ summary: "通知公告分页列表" })
  @Get()
  async getNoticePage(@Query() query: NoticeQueryDto) {
    return await this.noticeService.getNoticePage(query);
  }

  @ApiOperation({ summary: "新增" })
  @Post()
  async saveNotice(
    @CurrentUser("userId") currentUserId: string,
    @Body() formData: CreateNoticeDto
  ) {
    await this.noticeService.saveNotice({ ...formData, createBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "获取通知公告表单数据" })
  @Get(":id/form")
  async getNoticeForm(@Param("id") id: string) {
    return await this.noticeService.getNoticeFormData(id);
  }

  @ApiOperation({ summary: "阅读获取通知公告详情" })
  @Get(":id/detail")
  async getNoticeDetail(@Param("id") id: string) {
    return await this.noticeService.getNoticeDetail(id);
  }

  @ApiOperation({ summary: "修改通知公告" })
  @Put(":id")
  async updateNotice(
    @Param("id") id: string,
    @CurrentUser("userId") currentUserId: string,
    @Body() formData: UpdateNoticeDto
  ) {
    await this.noticeService.updateNotice(id, { ...formData, updateBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "发布通知公告" })
  @Put(":id/publish")
  async publishNotice(@Param("id") id: string, @CurrentUser("userId") currentUserId: string) {
    await this.noticeService.publishNotice(id, currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "撤回通知公告" })
  @Put(":id/revoke")
  async revokeNotice(@Param("id") id: string) {
    await this.noticeService.revokeNotice(id);
    return { success: true };
  }

  @ApiOperation({ summary: "删除通知公告" })
  @Delete(":ids")
  async deleteNotices(@Param("ids") ids: string) {
    const idArray = ids
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    await this.noticeService.deleteNotices(idArray);
    return { success: true };
  }

  @ApiOperation({ summary: "全部已读" })
  @Put("read-all")
  async readAll(@CurrentUser("userId") currentUserId: string) {
    await this.noticeService.readAll(currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "获取我的通知公告分页列表" })
  @Get("my")
  async getMyNoticePage(
    @CurrentUser("userId") currentUserId: string,
    @Query() query: NoticeQueryDto
  ) {
    return await this.noticeService.getMyNoticePage(currentUserId, query);
  }
}
