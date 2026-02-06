import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { SysNotice } from "./entities/sys-notice.entity";
import { SysUserNotice } from "./entities/sys-user-notice.entity";
import { NoticeQueryDto } from "./dto/notice-query.dto";
import { CreateNoticeDto, UpdateNoticeDto } from "./dto/notice-form.dto";
import { SysUser } from "../user/entities/sys-user.entity";
import { WebsocketGateway } from "src/platform/websocket/websocket.gateway";

/**
 * 通知公告服务
 */
@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(SysNotice)
    private readonly noticeRepository: Repository<SysNotice>,
    @InjectRepository(SysUserNotice)
    private readonly userNoticeRepository: Repository<SysUserNotice>,
    @InjectRepository(SysUser)
    private readonly userRepository: Repository<SysUser>,
    private readonly websocketGateway: WebsocketGateway
  ) {}

  async getNoticePage(query: NoticeQueryDto) {
    const { pageNum, pageSize, keywords, type, level, publishStatus } = query;

    const page = pageNum || 1;
    const size = pageSize || 10;

    const qb = this.noticeRepository.createQueryBuilder("n");
    qb.where("n.isDeleted = :isDeleted", { isDeleted: 0 });

    if (keywords) {
      qb.andWhere("n.title LIKE :keywords", { keywords: `%${keywords}%` });
    }

    if (type !== undefined && type !== null && type !== "") {
      qb.andWhere("n.type = :type", { type: Number(type) });
    }

    if (level) {
      qb.andWhere("n.level = :level", { level });
    }

    if (publishStatus !== undefined && publishStatus !== null && publishStatus !== "") {
      qb.andWhere("n.publishStatus = :publishStatus", { publishStatus: Number(publishStatus) });
    }

    qb.orderBy("n.createTime", "DESC");

    const [list, total] = await qb
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      data: list,
      page: {
        pageNum: page,
        pageSize: size,
        total,
      },
    };
  }

  /**
   * 新增通知公告
   * 处理目标用户并补充创建信息
   */
  async saveNotice(form: CreateNoticeDto & { createBy: string }) {
    const now = new Date();
    const normalizedTargetUserIds = this.normalizeTargetUserIds(form.targetUserIds);
    const notice = this.noticeRepository.create({
      ...form,
      targetUserIds: normalizedTargetUserIds,
      createBy: form.createBy.toString(),
      createTime: now,
      isDeleted: 0,
      publishStatus: 0,
    });
    await this.noticeRepository.save(notice);
    return true;
  }

  /**
   * 将目标用户 ID 统一转成逗号字符串
   * 空值返回 null
   */
  private normalizeTargetUserIds(targetUserIds?: number[] | string | null) {
    if (Array.isArray(targetUserIds)) {
      return targetUserIds.length ? targetUserIds.join(",") : null;
    }
    if (typeof targetUserIds === "string") {
      const trimmed = targetUserIds.trim();
      return trimmed.length ? trimmed : null;
    }
    return null;
  }

  /**
   * 解析数据库中的 targetUserIds 字符串
   * 返回 number[] 用于表单回填
   */
  private parseTargetUserIds(targetUserIds?: string | null): number[] {
    if (!targetUserIds) {
      return [];
    }
    return targetUserIds
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  }

  /**
   * 获取公告表单数据
   * 用于编辑弹窗回显
   */
  async getNoticeFormData(id: string): Promise<(CreateNoticeDto & { id: string }) | null> {
    const idStr = id.toString();
    const notice = await this.noticeRepository.findOne({ where: { id: idStr, isDeleted: 0 } });
    if (!notice) return null;
    const { title, content, type, level, targetType, targetUserIds } = notice;
    return {
      id: idStr,
      title,
      content,
      type,
      level,
      targetType,
      targetUserIds: this.parseTargetUserIds(targetUserIds),
    };
  }

  /**
   * 查看通知详情并标记已读
   */
  async getNoticeDetail(id: string, userId: string) {
    const idStr = id.toString();
    const notice = await this.noticeRepository.findOne({ where: { id: idStr, isDeleted: 0 } });
    if (notice) {
      // 标记当前用户的这条通知为已读
      await this.userNoticeRepository.update(
        { noticeId: idStr, userId: userId.toString(), isRead: 0 },
        { isRead: 1, readTime: new Date(), updateTime: new Date() }
      );
    }
    return notice;
  }

  /**
   * 更新公告信息
   * 同步目标用户字段
   */
  async updateNotice(id: string, form: UpdateNoticeDto & { updateBy: string }) {
    const idStr = id.toString();
    const notice = await this.noticeRepository.findOne({ where: { id: idStr, isDeleted: 0 } });
    if (!notice) {
      return false;
    }

    const normalizedTargetUserIds = this.normalizeTargetUserIds(form.targetUserIds);

    Object.assign(notice, form, {
      targetUserIds: normalizedTargetUserIds,
      updateBy: form.updateBy.toString(),
      updateTime: new Date(),
    });

    await this.noticeRepository.save(notice);
    return true;
  }

  async publishNotice(id: string, publisherId: string) {
    const idStr = id.toString();
    const notice = await this.noticeRepository.findOne({ where: { id: idStr, isDeleted: 0 } });
    if (!notice) return false;

    // 更新通知发布状态
    notice.publishStatus = 1;
    notice.publisherId = publisherId.toString();
    notice.publishTime = new Date();
    notice.updateTime = new Date();
    await this.noticeRepository.save(notice);

    // 根据 targetType 分发到用户
    const now = new Date();
    let targetUserIds: string[] = [];

    if (notice.targetType === 1) {
      // 全体用户：选择所有有效且未删除的用户
      const users = await this.userRepository.find({ where: { status: 1, isDeleted: 0 } });
      targetUserIds = users.map((u) => u.id);
    } else if (notice.targetType === 2 && notice.targetUserIds) {
      // 指定用户：解析 targetUserIds 字符串
      targetUserIds = notice.targetUserIds
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (targetUserIds.length) {
        // 过滤不存在或已删除的用户
        const users = await this.userRepository.find({
          where: { id: In(targetUserIds), isDeleted: 0 },
        });
        targetUserIds = users.map((u) => u.id);
      }
    }

    if (targetUserIds.length) {
      // 批量生成用户通知记录
      const records = targetUserIds.map((userId) => {
        const record = new SysUserNotice();
        record.noticeId = notice.id;
        record.userId = userId;
        record.isRead = 0;
        record.readTime = null;
        record.createTime = now;
        record.updateTime = now;
        record.isDeleted = 0;
        return record;
      });
      await this.userNoticeRepository.save(records);
    }

    // 发布后立刻推送给在线用户
    this.websocketGateway.broadcastNotification({
      id: notice.id,
      title: notice.title,
      type: notice.type,
      level: notice.level,
      publishTime: notice.publishTime,
    });

    return true;
  }

  async revokeNotice(id: string) {
    const notice = await this.noticeRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });
    if (!notice) return false;

    notice.publishStatus = -1;
    notice.revokeTime = new Date();
    notice.updateTime = new Date();
    await this.noticeRepository.save(notice);
    return true;
  }

  /**
   * 逻辑删除通知公告
   * 批量更新删除标识
   */
  async deleteNotices(ids: string[]) {
    const idStrs = (ids || []).map((v) => v.toString());
    await this.noticeRepository.update(idStrs, { isDeleted: 1 });
    return true;
  }

  /**
   * 全部标记已读
   */
  async readAll(userId: string) {
    const now = new Date();
    await this.userNoticeRepository
      .createQueryBuilder()
      .update(SysUserNotice)
      .set({ isRead: 1, readTime: now, updateTime: now })
      .where("userId = :userId", { userId: userId.toString() })
      .andWhere("isRead = 0")
      .andWhere("isDeleted = 0")
      .execute();
    return true;
  }

  /**
   * 获取我的通知分页列表
   */
  async getMyNoticePage(userId: string, query: NoticeQueryDto) {
    const { pageNum, pageSize, isRead } = query;

    const page = pageNum || 1;
    const size = pageSize || 10;

    const qb = this.userNoticeRepository
      .createQueryBuilder("un")
      .innerJoin(SysNotice, "n", "un.noticeId = n.id")
      .leftJoin(SysUser, "u", "n.publisherId = u.id")
      .where("un.userId = :userId", { userId: userId.toString() })
      .andWhere("un.isDeleted = 0")
      .andWhere("n.isDeleted = 0")
      .andWhere("n.publishStatus = 1")
      .orderBy("n.publishTime", "DESC")
      .addOrderBy("n.createTime", "DESC");

    // isRead 过滤：0 未读，1 已读，其他值则不过滤
    if (isRead === "0" || isRead === "1") {
      qb.andWhere("un.isRead = :isRead", { isRead: Number(isRead) });
    }

    const dataQb = qb
      .clone()
      .select("n.id", "id")
      .addSelect("n.title", "title")
      .addSelect("n.content", "content")
      .addSelect("n.type", "type")
      .addSelect("n.level", "level")
      .addSelect("n.publishStatus", "publishStatus")
      .addSelect("n.publishTime", "publishTime")
      .addSelect("n.revokeTime", "revokeTime")
      .addSelect("n.createTime", "createTime")
      .addSelect("n.targetType", "targetType")
      .addSelect("un.isRead", "isRead")
      .addSelect("u.nickname", "publisherName")
      .skip((page - 1) * size)
      .take(size);

    const [rows, total] = await Promise.all([dataQb.getRawMany(), qb.clone().getCount()]);

    return {
      data: rows,
      page: {
        pageNum: page,
        pageSize: size,
        total,
      },
    };
  }
}
