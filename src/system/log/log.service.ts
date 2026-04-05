import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SysLog } from "./entities/sys-log.entity";
import { LogQueryDto } from "./dto/log-query.dto";
import { LogPageDto } from "./dto/log-page.dto";
import { VisitTrendDto } from "./dto/visit-trend.dto";
import { VisitStatsDto } from "./dto/visit-stats.dto";
import { ActionTypeEnum, ActionTypeValue } from "../../common/enums/action-type.enum";
import { LogModuleEnum } from "../../common/enums/log-module.enum";
import { parseUserAgent } from "../../common/utils/user-agent.util";

export interface ManualLogParams {
  actionType: ActionTypeValue;
  operatorId: string;
  operatorName?: string;
  requestMethod: string;
  requestUri: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  errorMsg?: string;
  executionTime?: number;
}

/**
 * 日志服务
 */
@Injectable()
export class LogService {
  constructor(
    @InjectRepository(SysLog)
    private readonly logRepository: Repository<SysLog>
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

    const list: LogPageDto[] = records.map((item) => ({
      id: item.id,
      module: item.module !== null ? LogModuleEnum.getLabel(item.module) : null,
      actionType: item.actionType !== null ? ActionTypeEnum.getLabel(item.actionType) : null,
      title: item.title,
      content: item.content,
      operatorId: item.operatorId,
      operatorName: item.operatorName,
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
      createTime: item.createTime
        ? `${item.createTime.getFullYear()}-${String(item.createTime.getMonth() + 1).padStart(2, "0")}-${String(
            item.createTime.getDate()
          ).padStart(2, "0")} ${String(item.createTime.getHours()).padStart(2, "0")}:${String(
            item.createTime.getMinutes()
          ).padStart(2, "0")}:${String(item.createTime.getSeconds()).padStart(2, "0")}`
        : null,
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
      return { dates: [], pvList: [], uvList: [] };
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

    const uvRows = await this.logRepository
      .createQueryBuilder("log")
      .select("DATE_FORMAT(log.create_time, '%Y-%m-%d')", "date")
      .addSelect("COUNT(DISTINCT log.ip)", "count")
      .where("log.create_time BETWEEN :start AND :end", { start: startStr, end: endStr })
      .groupBy("DATE_FORMAT(log.create_time, '%Y-%m-%d')")
      .getRawMany<{ date: string; count: string }>();

    const pvMap = new Map<string, number>();
    pvRows.forEach((row) => pvMap.set(row.date, Number(row.count) || 0));

    const uvMap = new Map<string, number>();
    uvRows.forEach((row) => uvMap.set(row.date, Number(row.count) || 0));

    const pvList = dates.map((d) => pvMap.get(d) ?? 0);
    const uvList = dates.map((d) => uvMap.get(d) ?? 0);

    return {
      dates,
      pvList,
      uvList,
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

  /**
   * 手动记录日志（用于登录/登出等 Public 接口）
   * 拦截器无法从安全上下文获取 userId，需在业务逻辑中手动传入
   */
  async saveManualLog(params: ManualLogParams) {
    const { userAgent = "" } = params;
    const { browser, os } = parseUserAgent(userAgent);

    const log = new SysLog();
    log.actionType = params.actionType;
    log.requestMethod = params.requestMethod;
    log.requestUri = params.requestUri;
    log.ip = params.ip ?? null;
    log.device = os;
    log.os = os;
    log.browser = browser;
    log.status = params.status ?? 1;
    log.errorMsg = params.errorMsg ?? null;
    log.executionTime = params.executionTime ?? 0;
    log.operatorId = params.operatorId;
    log.operatorName = params.operatorName ?? null;
    log.createTime = new Date();

    await this.logRepository.save(log);
  }
}
