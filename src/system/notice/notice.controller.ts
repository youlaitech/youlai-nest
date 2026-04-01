import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Permissions } from "../../common/decorators/auth.decorator";
import { NoticeService } from "./notice.service";
import { NoticeQueryDto } from "./dto/notice-query.dto";
import { CreateNoticeDto, UpdateNoticeDto } from "./dto/notice-form.dto";

@ApiTags("08.通知公告")
@Controller("notices")
export class NoticeController {
  private readonly noticeService: NoticeService;

  constructor(noticeService: NoticeService) {
    this.noticeService = noticeService;
  }

  @ApiOperation({ summary: "通知公告分页列表" })
  @Get()
  @SetMetadata("resource", "sys_notice")
  @Permissions("sys:notice:list")
  async getNoticePage(@Query() query: NoticeQueryDto) {
    return await this.noticeService.getNoticePage(query);
  }

  @ApiOperation({ summary: "新增通知公告" })
  @Post()
  @Permissions("sys:notice:create")
  async saveNotice(
    @CurrentUser("userId") currentUserId: string,
    @Body() formData: CreateNoticeDto
  ) {
    await this.noticeService.saveNotice({ ...formData, createBy: currentUserId });
    return { success: true };
  }

  @ApiOperation({ summary: "获取通知公告表单数据" })
  @Get(":id/form")
  @Permissions("sys:notice:update")
  async getNoticeForm(@Param("id") id: string) {
    return await this.noticeService.getNoticeFormData(id);
  }

  @ApiOperation({ summary: "阅读获取通知公告详情" })
  @Get(":id/detail")
  async getNoticeDetail(@Param("id") id: string, @CurrentUser("userId") userId: string) {
    return await this.noticeService.getNoticeDetail(id, userId);
  }

  @ApiOperation({ summary: "全部已读" })
  @Put("read-all")
  async readAll(@CurrentUser("userId") currentUserId: string) {
    await this.noticeService.readAll(currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "修改通知公告" })
  @Put(":id")
  @Permissions("sys:notice:update")
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
  @Permissions("sys:notice:publish")
  async publishNotice(@Param("id") id: string, @CurrentUser("userId") currentUserId: string) {
    await this.noticeService.publishNotice(id, currentUserId);
    return { success: true };
  }

  @ApiOperation({ summary: "撤回通知公告" })
  @Put(":id/revoke")
  @Permissions("sys:notice:revoke")
  async revokeNotice(@Param("id") id: string) {
    await this.noticeService.revokeNotice(id);
    return { success: true };
  }

  @ApiOperation({ summary: "删除通知公告" })
  @Delete(":ids")
  @Permissions("sys:notice:delete")
  async deleteNotices(@Param("ids") ids: string) {
    const idArray = ids
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    await this.noticeService.deleteNotices(idArray);
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
