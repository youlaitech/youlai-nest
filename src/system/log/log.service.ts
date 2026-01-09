import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysLog } from "./entities/sys-log.entity";
import { LogQueryDto } from "./dto/log-query.dto";
import { LogPageVo } from "./dto/log-page.vo";
import { VisitTrendDto } from "./dto/visit-trend.dto";
import { VisitStatsDto } from "./dto/visit-stats.dto";
import { SysUser } from "../user/entities/sys-user.entity";

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(SysLog)
    private readonly logRepository: Repository<SysLog>,
    @InjectRepository(SysUser)
    private readonly userRepository: Repository<SysUser>
  ) {}

  async getLogPage(query: LogQueryDto) {
    const { pageNum, pageSize, keywords, createTime } = query;

    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const qb = this.logRepository.createQueryBuilder("log");

    if (keywords) {
      qb.andWhere(
        "(log.content LIKE :kw OR log.request_uri LIKE :kw OR log.method LIKE :kw OR log.province LIKE :kw OR log.city LIKE :kw OR log.browser LIKE :kw OR log.os LIKE :kw)",
        { kw: `%${keywords}%` }
      );
    }

    if (createTime && createTime.length === 2) {
      qb.andWhere("log.create_time BETWEEN :start AND :end", {
        start: createTime[0],
        end: createTime[1],
      });
    }

    qb.orderBy("log.create_time", "DESC");

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
    const userMap = new Map<number, string>();
    users.forEach((u) => userMap.set(u.id, u.nickname));

    const list: LogPageVo[] = records.map((item) => ({
      id: item.id,
      module: item.module,
      content: item.content,
      requestUri: item.requestUri,
      method: item.method,
      ip: item.ip,
      region: [item.province, item.city].filter(Boolean).join(" ") || null,
      browser: item.browser,
      os: item.os,
      executionTime: item.executionTime,
      createBy: item.createBy,
      // format createTime to 'YYYY-MM-DD HH:mm:ss' for consistent display
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
}
