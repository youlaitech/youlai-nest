import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { SysNotice } from "./entities/sys-notice.entity";
import { SysUserNotice } from "./entities/sys-user-notice.entity";
import { NoticeQueryDto } from "./dto/notice-query.dto";
import { CreateNoticeDto, UpdateNoticeDto } from "./dto/notice-form.dto";
import { SysUser } from "../user/entities/sys-user.entity";
import { WebsocketGateway } from "src/platform/websocket/websocket.gateway";

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

    // 在 Service 层自行处理分页参数，避免对外部请求做过强约束
    const page = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const size = Number(pageSize) > 0 ? Number(pageSize) : 10;

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

  async saveNotice(form: CreateNoticeDto & { createBy: number }) {
    const now = new Date();
    const notice = this.noticeRepository.create({
      ...form,
      createBy: form.createBy,
      createTime: now,
      isDeleted: 0,
      publishStatus: 0,
    });
    await this.noticeRepository.save(notice);
    return true;
  }

  async getNoticeFormData(id: number): Promise<CreateNoticeDto & { id: number }> {
    const notice = await this.noticeRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!notice) return null;
    const { title, content, type, level, targetType, targetUserIds } = notice;
    return { id, title, content, type, level, targetType, targetUserIds };
  }

  async getNoticeDetail(id: number) {
    return await this.noticeRepository.findOne({ where: { id, isDeleted: 0 } });
  }

  async updateNotice(id: number, form: UpdateNoticeDto & { updateBy: number }) {
    const notice = await this.noticeRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!notice) {
      return false;
    }

    Object.assign(notice, form, {
      updateBy: form.updateBy,
      updateTime: new Date(),
    });

    await this.noticeRepository.save(notice);
    return true;
  }

  async publishNotice(id: number, publisherId: number) {
    const notice = await this.noticeRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!notice) return false;

    // 更新通知发布状态
    notice.publishStatus = 1;
    notice.publisherId = publisherId;
    notice.publishTime = new Date();
    notice.updateTime = new Date();
    await this.noticeRepository.save(notice);

    // 根据 targetType 分发到用户
    const now = new Date();
    let targetUserIds: number[] = [];

    if (notice.targetType === 1) {
      // 全体用户：选择所有有效且未删除的用户
      const users = await this.userRepository.find({ where: { status: 1, isDeleted: 0 } });
      targetUserIds = users.map((u) => u.id);
    } else if (notice.targetType === 2 && notice.targetUserIds) {
      // 指定用户：解析 targetUserIds 字符串
      targetUserIds = notice.targetUserIds
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id));
      if (targetUserIds.length) {
        const users = await this.userRepository.find({
          where: { id: In(targetUserIds), isDeleted: 0 },
        });
        targetUserIds = users.map((u) => u.id);
      }
    }

    if (targetUserIds.length) {
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

    // 通过 WebSocket 广播通知消息
    this.websocketGateway.broadcastNotification({
      id: notice.id,
      title: notice.title,
      type: notice.type,
      level: notice.level,
      publishTime: notice.publishTime,
    });

    return true;
  }

  async revokeNotice(id: number) {
    const notice = await this.noticeRepository.findOne({ where: { id, isDeleted: 0 } });
    if (!notice) return false;

    notice.publishStatus = -1;
    notice.revokeTime = new Date();
    notice.updateTime = new Date();
    await this.noticeRepository.save(notice);
    return true;
  }

  async deleteNotices(ids: number[]) {
    await this.noticeRepository.update(ids, { isDeleted: 1 });
    return true;
  }

  async readAll(userId: number) {
    const now = new Date();
    await this.userNoticeRepository
      .createQueryBuilder()
      .update(SysUserNotice)
      .set({ isRead: 1, readTime: now })
      .where("userId = :userId", { userId })
      .execute();
    return true;
  }

  async getMyNoticePage(userId: number, query: NoticeQueryDto) {
    const { pageNum, pageSize, isRead } = query;

    const page = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const size = Number(pageSize) > 0 ? Number(pageSize) : 5;

    const qb = this.userNoticeRepository
      .createQueryBuilder("un")
      .innerJoinAndSelect(SysNotice, "n", "un.noticeId = n.id")
      .where("un.userId = :userId", { userId })
      .andWhere("un.isDeleted = 0")
      .andWhere("n.isDeleted = 0")
      .orderBy("n.publishTime", "DESC");

    // isRead 过滤：0 未读，1 已读，其他值则不过滤
    if (isRead === "0" || isRead === "1") {
      qb.andWhere("un.isRead = :isRead", { isRead: Number(isRead) });
    }

    const [rows, total] = await qb
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

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
