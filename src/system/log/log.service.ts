import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysLog } from "./entities/sys-log.entity";
import { LogQueryDto } from "./dto/log-query.dto";
import { LogPageVo } from "./dto/log-page.vo";
import { VisitTrendDto } from "./dto/visit-trend.dto";
import { VisitStatsDto } from "./dto/visit-stats.dto";
import { SysUser } from "../user/entities/sys-user.entity";
import { UserEventQueryDto, UserEventVo, LoginDeviceVo } from "./dto/user-event.dto";

/**
 * 日志服务
 */
@Injectable()
export class LogService {
  constructor(
    @InjectRepository(SysLog)
    private readonly logRepository: Repository<SysLog>,
    @InjectRepository(SysUser)
    private readonly userRepository: Repository<SysUser>
  ) {}

  async getLogPage(query: LogQueryDto) {
    const { pageNum, pageSize, keywords, createTime, sortBy, order } = query;

    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const qb = this.logRepository.createQueryBuilder("log");

    if (keywords) {
      qb.andWhere(
        "(log.action_type LIKE :kw OR log.request_uri LIKE :kw OR log.request_method LIKE :kw OR log.province LIKE :kw OR log.city LIKE :kw OR log.browser LIKE :kw OR log.os LIKE :kw OR log.device LIKE :kw OR log.error_msg LIKE :kw)",
        { kw: `%${keywords}%` }
      );
    }

    if (createTime && createTime.length >= 1) {
      const startTime = createTime[0];
      if (startTime) {
        qb.andWhere("log.create_time >= :start", { start: startTime });
      }
    }
    if (createTime && createTime.length >= 2) {
      const endTime = createTime[1];
      if (endTime) {
        // 结束日期拼接 23:59:59，包含当天所有数据
        const endDateTime = endTime.length === 10 ? `${endTime} 23:59:59` : endTime;
        qb.andWhere("log.create_time <= :end", { end: endDateTime });
      }
    }

    const allowedSortBy = new Set([
      "create_time",
      "execution_time",
      "action_type",
      "request_uri",
      "request_method",
      "ip",
      "status",
    ]);

    const normalizeOrder = (v?: string) => {
      const dir = (v || "").toUpperCase();
      return dir === "ASC" || dir === "DESC" ? dir : "DESC";
    };

    if (sortBy && allowedSortBy.has(sortBy)) {
      qb.orderBy(`log.${sortBy}`, normalizeOrder(order));
    } else {
      qb.orderBy("log.create_time", "DESC");
    }

    const [records, total] = await qb
      .skip((pageNumSafe - 1) * pageSizeSafe)
      .take(pageSizeSafe)
      .getManyAndCount();

    const userIds = Array.from(
      new Set(records.map((r) => r.createBy).filter((v) => v !== null && v !== undefined))
    );
    const users = userIds.length
      ? await this.userRepository
          .createQueryBuilder("user")
          .select(["user.id", "user.nickname"])
          .where("user.id IN (:...ids)", { ids: userIds })
          .getMany()
      : [];
    const userMap = new Map<string, string>();
    users.forEach((u) => userMap.set(u.id, u.nickname));

    const list: LogPageVo[] = records.map((item) => ({
      id: item.id,
      actionType: item.actionType,
      status: item.status,
      requestUri: item.requestUri,
      requestMethod: item.requestMethod,
      ip: item.ip,
      region: [item.province, item.city].filter(Boolean).join(" ") || null,
      device: item.device,
      browser: item.browser,
      os: item.os,
      executionTime: item.executionTime,
      errorMsg: item.errorMsg,
      createBy: item.createBy,
      createTime: item.createTime
        ? `${item.createTime.getFullYear()}-${String(item.createTime.getMonth() + 1).padStart(2, "0")}-${String(
            item.createTime.getDate()
          ).padStart(2, "0")} ${String(item.createTime.getHours()).padStart(2, "0")}:${String(
            item.createTime.getMinutes()
          ).padStart(2, "0")}:${String(item.createTime.getSeconds()).padStart(2, "0")}`
        : null,
      operator: item.createBy ? (userMap.get(item.createBy) ?? null) : null,
    }));

    return {
      data: list,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  async getVisitTrend(startDate: string, endDate: string): Promise<VisitTrendDto> {
    const start = new Date(startDate + " 00:00:00");
    const end = new Date(endDate + " 23:59:59");

    const dates: string[] = [];
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    if (!dates.length) {
      return { dates: [], pvList: [], ipList: [] };
    }

    const startStr = `${dates[0]} 00:00:00`;
    const endStr = `${dates[dates.length - 1]} 23:59:59`;

    const pvRows = await this.logRepository
      .createQueryBuilder("log")
      .select("DATE_FORMAT(log.create_time, '%Y-%m-%d')", "date")
      .addSelect("COUNT(*)", "count")
      .where("log.create_time BETWEEN :start AND :end", { start: startStr, end: endStr })
      .groupBy("DATE_FORMAT(log.create_time, '%Y-%m-%d')")
      .getRawMany<{ date: string; count: string }>();

    const ipRows = await this.logRepository
      .createQueryBuilder("log")
      .select("DATE_FORMAT(log.create_time, '%Y-%m-%d')", "date")
      .addSelect("COUNT(DISTINCT log.ip)", "count")
      .where("log.create_time BETWEEN :start AND :end", { start: startStr, end: endStr })
      .groupBy("DATE_FORMAT(log.create_time, '%Y-%m-%d')")
      .getRawMany<{ date: string; count: string }>();

    const pvMap = new Map<string, number>();
    pvRows.forEach((row) => pvMap.set(row.date, Number(row.count) || 0));

    const ipMap = new Map<string, number>();
    ipRows.forEach((row) => ipMap.set(row.date, Number(row.count) || 0));

    const pvList = dates.map((d) => pvMap.get(d) ?? 0);
    const ipList = dates.map((d) => ipMap.get(d) ?? 0);

    return {
      dates,
      pvList,
      ipList,
    };
  }

  async getVisitStats(): Promise<VisitStatsDto> {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    const todayStart = `${todayStr} 00:00:00`;
    const todayEnd = `${todayStr} 23:59:59`;

    // UV 统计：按 IP 粗略统计
    const [todayUvRow, totalUvRow] = await Promise.all([
      this.logRepository
        .createQueryBuilder("log")
        .select("COUNT(DISTINCT log.ip)", "count")
        .where("log.create_time BETWEEN :start AND :end", { start: todayStart, end: todayEnd })
        .getRawOne<{ count: string }>(),
      this.logRepository
        .createQueryBuilder("log")
        .select("COUNT(DISTINCT log.ip)", "count")
        .getRawOne<{ count: string }>(),
    ]);

    const todayUvCount = Number(todayUvRow?.count ?? 0);
    const totalUvCount = Number(totalUvRow?.count ?? 0);

    // PV 统计
    const [todayPvRow, totalPvRow] = await Promise.all([
      this.logRepository
        .createQueryBuilder("log")
        .select("COUNT(*)", "count")
        .where("log.create_time BETWEEN :start AND :end", { start: todayStart, end: todayEnd })
        .getRawOne<{ count: string }>(),
      this.logRepository
        .createQueryBuilder("log")
        .select("COUNT(*)", "count")
        .getRawOne<{ count: string }>(),
    ]);

    const todayPvCount = Number(todayPvRow?.count ?? 0);
    const totalPvCount = Number(totalPvRow?.count ?? 0);

    const prevUvTotal = totalUvCount - todayUvCount;
    const prevPvTotal = totalPvCount - todayPvCount;

    const uvGrowthRate =
      prevUvTotal > 0 ? Number(((todayUvCount / prevUvTotal - 1) * 100).toFixed(2)) : null;
    const pvGrowthRate =
      prevPvTotal > 0 ? Number(((todayPvCount / prevPvTotal - 1) * 100).toFixed(2)) : null;

    return {
      todayUvCount,
      totalUvCount,
      uvGrowthRate,
      todayPvCount,
      totalPvCount,
      pvGrowthRate,
    };
  }

  async getUserEventPage(userId: string, query: UserEventQueryDto) {
    const { pageNum = 1, pageSize = 10, actionType, startDate, endDate } = query;

    const qb = this.logRepository
      .createQueryBuilder("log")
      .where("log.create_by = :userId", { userId });

    if (actionType) {
      qb.andWhere("log.action_type = :actionType", { actionType });
    }
    if (startDate) {
      qb.andWhere("log.create_time >= :startDate", { startDate });
    }
    if (endDate) {
      const endDateTime = endDate.length === 10 ? `${endDate} 23:59:59` : endDate;
      qb.andWhere("log.create_time <= :endDate", { endDate: endDateTime });
    }

    const [records, total] = await qb
      .orderBy("log.create_time", "DESC")
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const list: UserEventVo[] = records.map((item) => ({
      id: item.id,
      actionType: item.actionType,
      status: item.status,
      device: item.device,
      os: item.os,
      browser: item.browser,
      ip: item.ip,
      region: [item.province, item.city].filter(Boolean).join(" ") || null,
      createTime: item.createTime
        ? `${item.createTime.getFullYear()}-${String(item.createTime.getMonth() + 1).padStart(2, "0")}-${String(item.createTime.getDate()).padStart(2, "0")} ${String(item.createTime.getHours()).padStart(2, "0")}:${String(item.createTime.getMinutes()).padStart(2, "0")}:${String(item.createTime.getSeconds()).padStart(2, "0")}`
        : null,
    }));

    return {
      data: list,
      page: { pageNum, pageSize, total },
    };
  }

  async getUserEventList(
    userId: string,
    query: UserEventQueryDto,
    limit: number
  ): Promise<UserEventVo[]> {
    const { actionType, startDate, endDate } = query;

    const qb = this.logRepository
      .createQueryBuilder("log")
      .where("log.create_by = :userId", { userId });

    if (actionType) {
      qb.andWhere("log.action_type = :actionType", { actionType });
    }
    if (startDate) {
      qb.andWhere("log.create_time >= :startDate", { startDate });
    }
    if (endDate) {
      const endDateTime = endDate.length === 10 ? `${endDate} 23:59:59` : endDate;
      qb.andWhere("log.create_time <= :endDate", { endDate: endDateTime });
    }

    const records = await qb.orderBy("log.create_time", "DESC").limit(limit).getMany();

    return records.map((item) => ({
      id: item.id,
      actionType: item.actionType,
      status: item.status,
      device: item.device,
      os: item.os,
      browser: item.browser,
      ip: item.ip,
      region: [item.province, item.city].filter(Boolean).join(" ") || null,
      createTime: item.createTime
        ? `${item.createTime.getFullYear()}-${String(item.createTime.getMonth() + 1).padStart(2, "0")}-${String(item.createTime.getDate()).padStart(2, "0")} ${String(item.createTime.getHours()).padStart(2, "0")}:${String(item.createTime.getMinutes()).padStart(2, "0")}:${String(item.createTime.getSeconds()).padStart(2, "0")}`
        : null,
    }));
  }

  async getLoginDevices(userId: string, days: number, limit: number): Promise<LoginDeviceVo[]> {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - days);

    const rows = await this.logRepository
      .createQueryBuilder("log")
      .select("log.device", "device")
      .addSelect("log.os", "os")
      .addSelect("log.browser", "browser")
      .addSelect("log.ip", "ip")
      .addSelect("log.province", "province")
      .addSelect("log.city", "city")
      .addSelect("COUNT(*)", "loginCount")
      .addSelect("MAX(log.create_time)", "lastLoginTime")
      .where("log.create_by = :userId", { userId })
      .andWhere("log.action_type = 'LOGIN'")
      .andWhere("log.create_time >= :startTime", { startTime })
      .groupBy("log.device, log.os, log.browser, log.ip, log.province, log.city")
      .orderBy("lastLoginTime", "DESC")
      .limit(limit)
      .getRawMany();

    return rows.map((row) => ({
      device: row.device,
      os: row.os,
      browser: row.browser,
      ip: row.ip,
      region: `${row.province || ""} ${row.city || ""}`.trim() || null,
      loginCount: Number(row.loginCount) || 0,
      lastLoginTime:
        row.lastLoginTime instanceof Date
          ? `${row.lastLoginTime.getFullYear()}-${String(row.lastLoginTime.getMonth() + 1).padStart(2, "0")}-${String(row.lastLoginTime.getDate()).padStart(2, "0")} ${String(row.lastLoginTime.getHours()).padStart(2, "0")}:${String(row.lastLoginTime.getMinutes()).padStart(2, "0")}:${String(row.lastLoginTime.getSeconds()).padStart(2, "0")}`
          : row.lastLoginTime,
    }));
  }
}
