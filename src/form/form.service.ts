import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { readFileSync } from "fs";
import { join } from "path";
import { DataSource, In, Repository } from "typeorm";

import { BusinessException } from "../common/exceptions/business.exception";
import { RedisService } from "../common/redis/redis.service";
import { SysMenu } from "../system/menu/entities/sys-menu.entity";
import { CreateFormDefinitionDto, FormDefinitionQueryDto } from "./dto/form.dto";
import { FormData, FormDefinition, FormSnapshot } from "./entities/form.entity";

const STATUS_DRAFT = 0;
const STATUS_PUBLISHED = 1;
const STATUS_DISABLED = -1;
const DEFAULT_CATALOG_NAME = "表单中心";
const FORM_ADMIN_CATALOG_NAME = "动态表单";
const PUBLIC_SUBMIT_LIMIT = 10;
const RENDER_CACHE_TTL = 1800;
const SYSTEM_PROMPT_PATH = ["src", "form", "templates", "form", "system.md"];

/**
 * 校验表单规则结构。
 */
function validateRule(rules: any[]): void {
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new BusinessException("表单规则格式非法：应为非空数组");
  }

  const checkNodes = (nodes: any[]) => {
    nodes.forEach((node) => {
      if (!node || typeof node !== "object") {
        throw new BusinessException("表单规则格式非法：节点必须为对象");
      }
      if (typeof node.type !== "string") {
        throw new BusinessException("表单规则格式非法：节点缺少 type");
      }
      const children = node.children || [];
      if (children.length > 0) {
        checkNodes(children);
      } else if (typeof node.field !== "string") {
        throw new BusinessException("表单规则格式非法：字段节点缺少 field");
      }
    });
  };

  checkNodes(rules);
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function matchType(kind: string, value: any): boolean {
  if (["number", "integer", "float"].includes(kind)) {
    return typeof value === "number";
  }
  if (kind === "array") {
    return Array.isArray(value);
  }
  return true;
}

/**
 * 按规则白名单过滤提交数据并校验必填与类型。
 */
function validateAndFilter(rules: any[], data: Record<string, any>): Record<string, any> {
  const filtered: Record<string, any> = {};
  const errors: string[] = [];

  const walk = (nodes: any[]) => {
    nodes.forEach((node) => {
      if (!node || typeof node !== "object") {
        return;
      }
      if (typeof node.field === "string" && node.field) {
        // 字段白名单：规则未声明的 field 直接丢弃
        if (Object.prototype.hasOwnProperty.call(data, node.field)) {
          filtered[node.field] = data[node.field];
        }
        const title = node.title || node.field;
        const value = data[node.field];
        (node.validate || []).forEach((rule: any) => {
          if (!rule || typeof rule !== "object") {
            return;
          }
          if (rule.required === true && isEmptyValue(value)) {
            errors.push(rule.message || `「${title}」不能为空`);
          }
          if (rule.type && !isEmptyValue(value) && !matchType(rule.type, value)) {
            errors.push(`「${title}」数据类型非法`);
          }
        });
      }
      const children = node.children || [];
      if (children.length > 0) {
        walk(children);
      }
    });
  };

  walk(rules);
  if (errors.length > 0) {
    throw new BusinessException(errors.join("；"));
  }
  return filtered;
}

function stripCodeFence(content: string): string {
  const text = (content || "").trim();
  if (!text.startsWith("```")) {
    return text;
  }
  const start = text.indexOf("\n");
  const end = text.lastIndexOf("```");
  if (start === -1 || end <= start) {
    return text;
  }
  return text.slice(start + 1, end).trim();
}

/**
 * 动态表单业务。
 */
@Injectable()
export class FormService {
  /** 公开提交计数（formKey:ip -> 窗口计数） */
  private readonly submitCounters = new Map<string, { count: number; expireAt: number }>();

  constructor(
    @InjectRepository(FormDefinition)
    private readonly definitionRepository: Repository<FormDefinition>,
    @InjectRepository(FormData)
    private readonly dataRepository: Repository<FormData>,
    @InjectRepository(FormSnapshot)
    private readonly snapshotRepository: Repository<FormSnapshot>,
    @InjectRepository(SysMenu)
    private readonly menuRepository: Repository<SysMenu>,
    private readonly redisService: RedisService,
    private readonly dataSource: DataSource,
  ) {}

  // ── 表单定义 ────────────────────────────────────────────────

  /**
   * 表单定义分页列表。
   */
  async getPage(query: FormDefinitionQueryDto) {
    const pageNum = Number(query.pageNum) > 0 ? Number(query.pageNum) : 1;
    const pageSize = Number(query.pageSize) > 0 ? Number(query.pageSize) : 10;

    const queryBuilder = this.definitionRepository.createQueryBuilder("form");
    queryBuilder.where("form.isDeleted = 0");

    if (query.keywords) {
      queryBuilder.andWhere("(form.formName LIKE :keywords OR form.formKey LIKE :keywords)", {
        keywords: `%${query.keywords}%`,
      });
    }
    if (query.status !== undefined && query.status !== null) {
      queryBuilder.andWhere("form.status = :status", { status: query.status });
    }
    if (query.category) {
      queryBuilder.andWhere("form.category = :category", { category: query.category });
    }

    const [rows, total] = await queryBuilder
      .orderBy("form.id", "DESC")
      .skip((pageNum - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      data: rows.map((row) => ({
        id: row.id,
        formKey: row.formKey,
        formName: row.formName,
        description: row.description,
        status: row.status,
        isPublic: row.isPublic,
        category: row.category,
        version: row.version,
        createTime: row.createTime,
      })),
      page: { pageNum, pageSize, total },
    };
  }

  /**
   * 表单设计数据回显。
   */
  async getForm(id: string | number) {
    return await this.findDefinitionOrFail(id);
  }

  /**
   * 新增表单定义。
   */
  async create(form: CreateFormDefinitionDto, userId?: string) {
    const formKey = (form.formKey || "").trim();
    const exist = await this.definitionRepository.findOne({
      where: { formKey, isDeleted: 0 },
    });
    if (exist) {
      throw new BusinessException("表单标识已存在");
    }

    const entity = this.definitionRepository.create({
      ...form,
      formKey,
      formName: (form.formName || "").trim(),
      category: form.category || "normal",
      status: STATUS_DRAFT,
      version: 1,
      createBy: userId ?? null,
      createTime: new Date(),
    });
    const saved = await this.definitionRepository.save(entity);
    return saved.id;
  }

  /**
   * 修改表单定义。
   */
  async update(id: string | number, form: CreateFormDefinitionDto, userId?: string) {
    const entity = await this.findDefinitionOrFail(id);

    const formKey = (form.formKey || "").trim();
    if (formKey && formKey !== entity.formKey) {
      throw new BusinessException("表单标识创建后不可修改");
    }

    const patch: Partial<FormDefinition> = {
      formName: (form.formName || entity.formName).trim(),
      description: form.description ?? entity.description,
      updateBy: userId ?? null,
      updateTime: new Date(),
    };
    if (form.formJson !== undefined) {
      patch.formJson = form.formJson;
    }
    if (form.optionsJson !== undefined) {
      patch.optionsJson = form.optionsJson;
    }
    if (form.isPublic !== undefined) {
      patch.isPublic = form.isPublic;
    }
    if (entity.status === STATUS_DRAFT && form.category) {
      patch.category = form.category;
    }

    await this.definitionRepository.update(entity.id, patch);

    // 已发布表单规则变更后清渲染缓存，保证渲染端即时生效
    if (entity.status === STATUS_PUBLISHED) {
      await this.evictRenderCache(entity.formKey);
    }
    return true;
  }

  /**
   * 删除表单（级联逻辑删除数据与快照，并清理生成的菜单）。
   */
  async remove(ids: string) {
    const idList = String(ids || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    if (idList.length === 0) {
      throw new BusinessException("删除的表单数据为空");
    }

    for (const id of idList) {
      const entity = await this.definitionRepository.findOne({
        where: { id, isDeleted: 0 },
      });
      if (!entity) {
        continue;
      }
      if (entity.menuId) {
        await this.dataSource.query("DELETE FROM sys_role_menu WHERE menu_id = ?", [entity.menuId]);
        await this.menuRepository.delete(entity.menuId);
      }
      await this.evictRenderCache(entity.formKey);
    }

    await this.definitionRepository.update(
      { id: In(idList), isDeleted: 0 },
      { isDeleted: 1, updateTime: new Date() },
    );
    await this.dataRepository.update(
      { formId: In(idList), isDeleted: 0 },
      { isDeleted: 1, updateTime: new Date() },
    );
    await this.snapshotRepository.update(
      { formId: In(idList), isDeleted: 0 },
      { isDeleted: 1, updateTime: new Date() },
    );
    return true;
  }

  /**
   * 发布表单（版本递增并固化快照）。
   */
  async publish(id: string | number) {
    const entity = await this.findDefinitionOrFail(id);
    const version = entity.version + 1;

    await this.definitionRepository.update(entity.id, {
      status: STATUS_PUBLISHED,
      version,
      updateTime: new Date(),
    });

    // 固化版本快照：数据回显按提交时版本加载，防止规则变更导致历史数据漂移
    await this.snapshotRepository.save(
      this.snapshotRepository.create({
        formId: entity.id,
        version,
        formJson: entity.formJson,
        optionsJson: entity.optionsJson,
        createTime: new Date(),
      }),
    );

    await this.evictRenderCache(entity.formKey);
    return true;
  }

  /**
   * 停用表单。
   */
  async disable(id: string | number) {
    const entity = await this.findDefinitionOrFail(id);
    await this.definitionRepository.update(entity.id, {
      status: STATUS_DISABLED,
      updateTime: new Date(),
    });
    return true;
  }

  // ── 渲染 ────────────────────────────────────────────────────

  /**
   * 已发布表单渲染规则（Redis 缓存兜底 30 分钟）。
   */
  async render(formKey: string) {
    const cacheKey = `form:render:${formKey}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return typeof cached === "string" ? JSON.parse(cached) : cached;
      }
    } catch {
      // 缓存异常不影响主流程
    }

    const entity = await this.definitionRepository.findOne({
      where: { formKey, status: STATUS_PUBLISHED, isDeleted: 0 },
    });
    if (!entity) {
      throw new BusinessException("表单不存在或未发布");
    }

    const payload = this.renderPayload(entity);
    try {
      await this.redisService.set(cacheKey, JSON.stringify(payload));
    } catch {
      // 缓存写入失败忽略
    }
    return payload;
  }

  /**
   * 公开表单渲染规则（直查库校验 isPublic，不走缓存）。
   */
  async publicRender(formKey: string) {
    const entity = await this.definitionRepository.findOne({
      where: { formKey, status: STATUS_PUBLISHED, isPublic: 1, isDeleted: 0 },
    });
    if (!entity) {
      throw new BusinessException("表单不存在或未开放公开访问");
    }
    return this.renderPayload(entity);
  }

  /**
   * 审批表单下拉选项。
   */
  async workflowOptions() {
    const list = await this.definitionRepository.find({
      where: { category: "workflow", status: STATUS_PUBLISHED, isDeleted: 0 },
      order: { id: "ASC" },
    });
    return list.map((item) => ({ value: item.formKey, label: item.formName }));
  }

  // ── 访问菜单 ────────────────────────────────────────────────

  /**
   * 表单访问菜单回显。
   */
  async getMenu(id: string | number) {
    const entity = await this.findDefinitionOrFail(id);
    if (!entity.menuId) {
      return null;
    }

    const menu = await this.menuRepository.findOne({ where: { id: entity.menuId } });
    if (!menu) {
      return null;
    }

    const rows: Array<{ role_id: string }> = await this.dataSource.query(
      "SELECT role_id FROM sys_role_menu WHERE menu_id = ?",
      [menu.id],
    );
    return {
      menuId: menu.id,
      menuName: menu.name,
      parentId: menu.parentId,
      roleIds: rows.map((row) => String(row.role_id)),
    };
  }

  /**
   * 生成或更新表单访问菜单，并按需授权角色（幂等）。
   */
  async saveMenu(id: string | number, form: { menuName: string; parentId?: string; roleIds?: string[] }) {
    const entity = await this.findDefinitionOrFail(id);

    let parent: SysMenu;
    if (form.parentId && form.parentId !== "0") {
      const found = await this.menuRepository.findOne({ where: { id: form.parentId } });
      if (!found) {
        throw new BusinessException("上级菜单不存在");
      }
      if (found.type !== "C") {
        throw new BusinessException("上级菜单必须为目录类型");
      }
      parent = found;
    } else {
      parent = await this.getOrCreateCatalog();
    }

    const routeName = `FormRender${this.toUpperCamel(entity.formKey)}`;
    const treePath = parent.treePath ? `${parent.treePath},${parent.id}` : String(parent.id);
    const params = { formKey: entity.formKey };

    let menuId = entity.menuId;
    if (menuId) {
      const existing = await this.menuRepository.findOne({ where: { id: menuId } });
      if (existing) {
        await this.menuRepository.update(existing.id, {
          parentId: parent.id,
          name: form.menuName.trim(),
          routeName,
          routePath: entity.formKey,
          component: "dynamic-form/render",
          params,
          treePath,
          updateTime: new Date(),
        });
      }
    }

    if (!menuId) {
      const created = this.menuRepository.create({
        parentId: parent.id,
        treePath,
        name: form.menuName.trim(),
        type: "M",
        routeName,
        routePath: entity.formKey,
        component: "dynamic-form/render",
        params,
        visible: 1,
        sort: 1,
        createTime: new Date(),
      });
      const saved = await this.menuRepository.save(created);
      menuId = saved.id;
    }

    // 回写 menuId：下次生成走更新语义，防重复生成菜单
    await this.definitionRepository.update(entity.id, {
      menuId,
      updateTime: new Date(),
    });

    if (form.roleIds && form.roleIds.length > 0) {
      await this.assignMenuRoles(menuId, treePath, form.roleIds);
    }
    return true;
  }

  // ── 表单数据 ────────────────────────────────────────────────

  /**
   * 提交表单数据（需已发布）。
   */
  async submit(formKey: string, data: Record<string, any>, userId?: string) {
    const entity = await this.definitionRepository.findOne({
      where: { formKey, isDeleted: 0 },
    });
    if (!entity) {
      throw new BusinessException("表单不存在");
    }
    if (entity.status !== STATUS_PUBLISHED) {
      throw new BusinessException("表单未发布或已停用");
    }
    return this.persist(entity, data, userId);
  }

  /**
   * 匿名提交公开表单。
   */
  async submitPublic(formKey: string, data: Record<string, any>, ip: string) {
    const entity = await this.definitionRepository.findOne({
      where: { formKey, isDeleted: 0 },
    });
    if (!entity || entity.isPublic !== 1 || entity.status !== STATUS_PUBLISHED) {
      throw new BusinessException("表单不存在或未开放公开访问");
    }
    if (!(await this.checkPublicLimit(formKey, ip))) {
      throw new BusinessException("提交过于频繁，请稍后再试");
    }
    return this.persist(entity, data);
  }

  /**
   * 表单数据分页。
   */
  async getDataPage(formKey: string, pageNum: number, pageSize: number) {
    const entity = await this.definitionRepository.findOne({
      where: { formKey, isDeleted: 0 },
    });
    if (!entity) {
      throw new BusinessException("表单不存在");
    }

    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;

    const [rows, total] = await this.dataRepository.findAndCount({
      where: { formId: entity.id, isDeleted: 0 },
      order: { id: "DESC" },
      skip: (pageNumSafe - 1) * pageSizeSafe,
      take: pageSizeSafe,
    });

    // 提交人昵称按批查询补全，避免逐行查库
    const userIds = Array.from(new Set(rows.map((row) => row.createBy).filter((item) => !!item)));
    const nicknameMap = await this.nicknamesByUserIds(userIds as string[]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        formVersion: row.formVersion,
        dataJson: row.dataJson,
        createBy: row.createBy ?? null,
        createByName: row.createBy ? nicknameMap[row.createBy] ?? null : null,
        createTime: row.createTime,
      })),
      page: { pageNum: pageNumSafe, pageSize: pageSizeSafe, total },
    };
  }

  /**
   * 表单数据详情（按提交时版本快照回显规则）。
   */
  async getDataDetail(dataId: string | number) {
    const row = await this.dataRepository.findOne({
      where: { id: dataId.toString(), isDeleted: 0 },
    });
    if (!row) {
      throw new BusinessException("表单数据不存在");
    }

    // 命中版本快照用快照规则，否则回退当前定义（兼容快照表启用前提交的历史数据）
    const snapshot = await this.snapshotRepository.findOne({
      where: { formId: row.formId, version: row.formVersion, isDeleted: 0 },
    });
    let formJson = snapshot?.formJson ?? null;
    let optionsJson = snapshot?.optionsJson ?? null;
    if (!snapshot) {
      const definition = await this.definitionRepository.findOne({ where: { id: row.formId } });
      formJson = definition?.formJson ?? null;
      optionsJson = definition?.optionsJson ?? null;
    }

    return {
      id: row.id,
      formVersion: row.formVersion,
      dataJson: row.dataJson,
      createBy: row.createBy ?? null,
      createTime: row.createTime,
      formJson,
      optionsJson,
    };
  }

  /**
   * 逻辑删除表单数据。
   */
  async deleteData(ids: string) {
    const idList = String(ids || "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    if (idList.length === 0) {
      throw new BusinessException("删除的表单数据为空");
    }

    await this.dataRepository.update({ id: In(idList), isDeleted: 0 }, {
      isDeleted: 1,
      updateTime: new Date(),
    });
    return true;
  }

  // ── AI ──────────────────────────────────────────────────────

  /**
   * 用 AI 把需求描述转成 form-create 规则，产出经结构校验后才返回。
   */
  async aiGenerateRule(description: string): Promise<any[]> {
    const baseUrl = process.env.AI_BASE_URL;
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || "qwen-plus";
    const timeout = Number(process.env.AI_TIMEOUT_MS) > 0 ? Number(process.env.AI_TIMEOUT_MS) : 60000;

    if (!baseUrl || !apiKey) {
      throw new BusinessException("AI 功能未开启，请配置 AI_BASE_URL 与 AI_API_KEY");
    }

    const prompt = readFileSync(join(process.cwd(), ...SYSTEM_PROMPT_PATH), "utf-8").trim();
    const response = await axios.post(
      `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `需求描述：\n${description}` },
        ],
        response_format: { type: "json_object" },
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        timeout,
      },
    );

    const content = stripCodeFence(response.data?.choices?.[0]?.message?.content ?? "");
    let rules: any[];
    try {
      rules = JSON.parse(content);
    } catch {
      throw new BusinessException("AI 返回内容非合法 JSON，请重试");
    }

    validateRule(rules);
    return rules;
  }

  // ── 私有方法 ────────────────────────────────────────────────

  private async findDefinitionOrFail(id: string | number): Promise<FormDefinition> {
    const entity = await this.definitionRepository.findOne({
      where: { id: id.toString(), isDeleted: 0 },
    });
    if (!entity) {
      throw new BusinessException("表单不存在");
    }
    return entity;
  }

  private renderPayload(entity: FormDefinition) {
    return {
      formKey: entity.formKey,
      formName: entity.formName,
      version: entity.version,
      formJson: entity.formJson,
      optionsJson: entity.optionsJson,
    };
  }

  private async evictRenderCache(formKey: string): Promise<void> {
    try {
      await this.redisService.del(`form:render:${formKey}`);
    } catch {
      // 缓存清理失败忽略
    }
  }

  private async persist(entity: FormDefinition, data: Record<string, any>, userId?: string) {
    const filtered = validateAndFilter(entity.formJson || [], data || {});
    await this.dataRepository.save(
      this.dataRepository.create({
        formId: entity.id,
        formVersion: entity.version,
        dataJson: filtered,
        createBy: userId ?? null,
        createTime: new Date(),
      }),
    );
    return true;
  }

  /**
   * 公开表单按 formKey + IP 限流（进程内固定窗口计数；多实例部署时由网关兜底）。
   */
  private async checkPublicLimit(formKey: string, ip: string): Promise<boolean> {
    const key = `${formKey}:${ip}`;
    const now = Date.now();
    const entry = this.submitCounters.get(key);

    if (!entry || entry.expireAt <= now) {
      this.submitCounters.set(key, { count: 1, expireAt: now + 60_000 });
      return true;
    }
    if (entry.count >= PUBLIC_SUBMIT_LIMIT) {
      return false;
    }
    entry.count += 1;
    return true;
  }

  private async nicknamesByUserIds(ids: string[]): Promise<Record<string, string>> {
    if (ids.length === 0) {
      return {};
    }
    const rows: Array<{ id: string; nickname: string }> = await this.dataSource.query(
      `SELECT id, nickname FROM sys_user WHERE id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    return rows.reduce((acc, row) => {
      acc[String(row.id)] = row.nickname;
      return acc;
    }, {} as Record<string, string>);
  }

  private toUpperCamel(value: string): string {
    return value
      .split("_")
      .filter((part) => !!part)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  /**
   * 确保默认挂载目录"表单中心"存在，不存在则创建。
   */
  private async getOrCreateCatalog(): Promise<SysMenu> {
    const catalog = await this.menuRepository.findOne({
      where: { name: DEFAULT_CATALOG_NAME, type: "C" },
    });
    if (catalog) {
      return catalog;
    }

    const adminCatalog = await this.menuRepository.findOne({
      where: { name: FORM_ADMIN_CATALOG_NAME, type: "C" },
    });

    let parentId = "0";
    let treePath = "0";
    let routePath = "/form-center";
    if (adminCatalog) {
      parentId = adminCatalog.id;
      treePath = adminCatalog.treePath
        ? `${adminCatalog.treePath},${adminCatalog.id}`
        : String(adminCatalog.id);
      routePath = "center";
    }

    const created = this.menuRepository.create({
      parentId,
      treePath,
      name: DEFAULT_CATALOG_NAME,
      type: "C",
      routePath,
      component: "Layout",
      visible: 1,
      sort: 5,
      icon: "el-icon-EditPen",
      createTime: new Date(),
    });
    return await this.menuRepository.save(created);
  }

  /**
   * 给角色授权菜单（含 treePath 祖先目录，幂等）。
   */
  private async assignMenuRoles(menuId: string, treePath: string, roleIds: string[]): Promise<void> {
    const grantIds = new Set<string>([String(menuId)]);
    treePath.split(",").forEach((part) => {
      const trimmed = part.trim();
      if (trimmed && trimmed !== "0") {
        grantIds.add(trimmed);
      }
    });

    const menuIds = Array.from(grantIds);
    const rows: Array<{ role_id: string; menu_id: string }> = await this.dataSource.query(
      `SELECT role_id, menu_id FROM sys_role_menu WHERE menu_id IN (${menuIds.map(() => "?").join(",")})`,
      menuIds,
    );
    const existing = new Set(rows.map((row) => `${row.role_id}:${row.menu_id}`));

    for (const roleId of roleIds) {
      for (const grantId of menuIds) {
        if (existing.has(`${roleId}:${grantId}`)) {
          continue;
        }
        await this.dataSource.query(
          "INSERT INTO sys_role_menu (role_id, menu_id) VALUES (?, ?)",
          [roleId, grantId],
        );
      }
    }
  }
}
