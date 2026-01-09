import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
// velocityjs 没有稳定的 TS 类型定义，使用 any
import * as Velocity from "velocityjs";

import type { CodegenPreviewVo } from "./dto/codegen-preview.vo";
import type { GenConfigFormDto, FieldConfigDto } from "./dto/gen-config-form.dto";
import type { TableQueryDto } from "./dto/table-query.dto";

type TemplateName =
  | "API"
  | "API_TYPES"
  | "VIEW"
  | "Controller"
  | "Service"
  | "ServiceImpl"
  | "Mapper"
  | "MapperXml"
  | "Converter"
  | "Query"
  | "Form"
  | "Vo"
  | "Entity";

interface TemplateConfig {
  templatePath: string;
  subpackageName: string;
  extension: string;
}

@Injectable()
export class CodegenService {
  constructor(private readonly dataSource: DataSource) {}

  private readonly codegenConfig = {
    downloadFileName: "youlai-admin-code.zip",
    backendAppName: "youlai-boot",
    frontendAppName: "vue3-element-admin",
    defaultAuthor: "youlaitech",
    defaultModuleName: "system",
    defaultPackageName: "com.youlai.boot",
    defaultRemoveTablePrefix: "sys_",
  };

  private readonly templateConfigs: Record<TemplateName, TemplateConfig> = {
    API: { templatePath: "codegen/api.ts.vm", subpackageName: "api", extension: ".ts" },
    API_TYPES: {
      templatePath: "codegen/api-types.ts.vm",
      subpackageName: "types",
      extension: ".ts",
    },
    VIEW: { templatePath: "codegen/index.vue.vm", subpackageName: "views", extension: ".vue" },
    Controller: {
      templatePath: "codegen/controller.java.vm",
      subpackageName: "controller",
      extension: ".java",
    },
    Service: {
      templatePath: "codegen/service.java.vm",
      subpackageName: "service",
      extension: ".java",
    },
    ServiceImpl: {
      templatePath: "codegen/serviceImpl.java.vm",
      subpackageName: "service.impl",
      extension: ".java",
    },
    Mapper: {
      templatePath: "codegen/mapper.java.vm",
      subpackageName: "mapper",
      extension: ".java",
    },
    MapperXml: {
      templatePath: "codegen/mapper.xml.vm",
      subpackageName: "mapper",
      extension: ".xml",
    },
    Converter: {
      templatePath: "codegen/converter.java.vm",
      subpackageName: "converter",
      extension: ".java",
    },
    Query: {
      templatePath: "codegen/query.java.vm",
      subpackageName: "model.query",
      extension: ".java",
    },
    Form: {
      templatePath: "codegen/form.java.vm",
      subpackageName: "model.form",
      extension: ".java",
    },
    Vo: { templatePath: "codegen/vo.java.vm", subpackageName: "model.vo", extension: ".java" },
    Entity: {
      templatePath: "codegen/entity.java.vm",
      subpackageName: "model.entity",
      extension: ".java",
    },
  };

  async getTablePage(query: TableQueryDto) {
    const { pageNum, pageSize, keywords } = query;

    const pageNumSafe = Number(pageNum) > 0 ? Number(pageNum) : 1;
    const pageSizeSafe = Number(pageSize) > 0 ? Number(pageSize) : 10;
    const offset = (pageNumSafe - 1) * pageSizeSafe;

    const params: any[] = [];
    let where = "t.TABLE_SCHEMA = DATABASE()";
    // exclude codegen metadata tables
    where += " AND t.TABLE_NAME NOT IN ('gen_table','gen_table_column')";
    if (keywords) {
      where += " AND t.TABLE_NAME LIKE ?";
      params.push(`%${keywords}%`);
    }

    const listSql = `
      SELECT
        t.TABLE_NAME AS tableName,
        t.TABLE_COMMENT AS tableComment,
        t.TABLE_COLLATION AS tableCollation,
        t.ENGINE AS engine,
        DATE_FORMAT(t.CREATE_TIME, '%Y-%m-%d %H:%i:%s') AS createTime,
        IF(c.id IS NULL, 0, 1) AS isConfigured
      FROM information_schema.TABLES t
      LEFT JOIN gen_table c
        ON c.table_name = t.TABLE_NAME AND c.is_deleted = b'0'
      WHERE ${where}
      ORDER BY t.CREATE_TIME DESC
      LIMIT ? OFFSET ?
    `;

    const totalSql = `
      SELECT COUNT(1) AS total
      FROM information_schema.TABLES t
      WHERE ${where}
    `;

    const [list, totalRows] = await Promise.all([
      this.dataSource.query(listSql, [...params, pageSizeSafe, offset]),
      this.dataSource.query(totalSql, params),
    ]);

    const total = Number(totalRows?.[0]?.total || 0);
    return {
      data: list,
      page: {
        pageNum: pageNumSafe,
        pageSize: pageSizeSafe,
        total,
      },
    };
  }

  async getGenConfig(tableName: string): Promise<GenConfigFormDto> {
    const configRows = await this.dataSource.query(
      `SELECT id, table_name, module_name, package_name, business_name, entity_name, author, parent_menu_id
       FROM gen_table
       WHERE table_name = ? AND is_deleted = b'0'
       LIMIT 1`,
      [tableName]
    );

    const config = configRows?.[0];
    if (config) {
      const fieldRows = await this.dataSource.query(
        `SELECT
          id,
          column_name AS columnName,
          column_type AS columnType,
          field_name AS fieldName,
          field_type AS fieldType,
          field_comment AS fieldComment,
          is_show_in_list AS isShowInList,
          is_show_in_form AS isShowInForm,
          is_show_in_query AS isShowInQuery,
          is_required AS isRequired,
          form_type AS formType,
          query_type AS queryType,
          max_length AS maxLength,
          field_sort AS fieldSort,
          dict_type AS dictType
        FROM gen_table_column
        WHERE table_id = ?
        ORDER BY ordinal_position ASC`,
        [config.id]
      );

      return {
        id: String(config.id),
        tableName: config.table_name,
        moduleName: config.module_name,
        packageName: config.package_name,
        businessName: config.business_name,
        entityName: config.entity_name,
        author: config.author,
        parentMenuId: config.parent_menu_id ? String(config.parent_menu_id) : undefined,
        backendAppName: this.codegenConfig.backendAppName,
        frontendAppName: this.codegenConfig.frontendAppName,
        removeTablePrefix: this.codegenConfig.defaultRemoveTablePrefix,
        pageType: "classic",
        fieldConfigs: fieldRows as FieldConfigDto[],
      };
    }

    // 未配置：按表结构生成默认配置
    const tableMetaRows = await this.dataSource.query(
      `SELECT TABLE_COMMENT AS tableComment
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
       LIMIT 1`,
      [tableName]
    );

    const tableComment = String(tableMetaRows?.[0]?.tableComment || "");
    const businessName = tableComment ? tableComment.replace("表", "").trim() : tableName;

    const removePrefix = this.codegenConfig.defaultRemoveTablePrefix;
    const processed =
      removePrefix && tableName.startsWith(removePrefix)
        ? tableName.slice(removePrefix.length)
        : tableName;
    const entityName = toPascalCase(processed);

    const columns = await this.dataSource.query(
      `SELECT
        COLUMN_NAME AS columnName,
        DATA_TYPE AS columnType,
        COLUMN_COMMENT AS columnComment,
        IS_NULLABLE AS isNullable,
        CHARACTER_MAXIMUM_LENGTH AS maxLength,
        ORDINAL_POSITION AS ordinalPosition
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION ASC`,
      [tableName]
    );

    const fieldConfigs: FieldConfigDto[] = (columns || []).map((col: any, idx: number) => {
      const columnType = String(col.columnType || "");
      const javaType = getJavaTypeByColumnType(columnType);
      return {
        columnName: col.columnName,
        columnType,
        fieldName: toCamelCase(String(col.columnName)),
        fieldType: javaType,
        fieldComment: col.columnComment,
        isRequired: String(col.isNullable).toUpperCase() === "YES" ? 0 : 1,
        formType: getDefaultFormTypeByColumnType(columnType),
        queryType: 1, // EQ
        maxLength: col.maxLength ? Number(col.maxLength) : undefined,
        fieldSort: idx + 1,
        isShowInList: 1,
        isShowInForm: 1,
        isShowInQuery: 0,
      };
    });

    return {
      tableName,
      businessName,
      moduleName: this.codegenConfig.defaultModuleName,
      packageName: this.codegenConfig.defaultPackageName,
      entityName,
      author: this.codegenConfig.defaultAuthor,
      backendAppName: this.codegenConfig.backendAppName,
      frontendAppName: this.codegenConfig.frontendAppName,
      removeTablePrefix: removePrefix,
      pageType: "classic",
      fieldConfigs,
    };
  }

  async saveGenConfig(tableName: string, body: GenConfigFormDto) {
    const now = new Date();
    const cfgRows = await this.dataSource.query(
      `SELECT id
       FROM gen_table
       WHERE table_name = ?
       LIMIT 1`,
      [tableName]
    );

    const moduleName = body.moduleName || this.codegenConfig.defaultModuleName;
    const packageName = body.packageName || this.codegenConfig.defaultPackageName;
    const businessName = body.businessName || tableName;
    const entityName = body.entityName || toPascalCase(tableName);
    const author = body.author || this.codegenConfig.defaultAuthor;
    const parentMenuId = body.parentMenuId ? Number(body.parentMenuId) : null;

    let configId: number;
    if (cfgRows?.[0]?.id) {
      configId = Number(cfgRows[0].id);
      await this.dataSource.query(
        `UPDATE gen_table
         SET module_name = ?,
             package_name = ?,
             business_name = ?,
             entity_name = ?,
             author = ?,
             parent_menu_id = ?,
             update_time = ?,
             is_deleted = b'0'
         WHERE id = ?`,
        [moduleName, packageName, businessName, entityName, author, parentMenuId, now, configId]
      );
    } else {
      const insertResult: any = await this.dataSource.query(
        `INSERT INTO gen_table(
            table_name, module_name, package_name, business_name, entity_name, author, parent_menu_id,
            create_time, update_time, is_deleted
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, b'0')`,
        [
          tableName,
          moduleName,
          packageName,
          businessName,
          entityName,
          author,
          parentMenuId,
          now,
          now,
        ]
      );

      configId = Number(insertResult?.insertId);
    }

    // 先清理旧字段配置，再写入新配置
    await this.dataSource.query(`DELETE FROM gen_table_column WHERE table_id = ?`, [configId]);

    const fieldConfigs = body.fieldConfigs || [];
    for (let i = 0; i < fieldConfigs.length; i++) {
      const f = fieldConfigs[i] as FieldConfigDto;
      const columnType = String(f.columnType || "");
      const javaType = f.fieldType || getJavaTypeByColumnType(columnType);

      await this.dataSource.query(
        `INSERT INTO gen_table_column(
            table_id, column_name, column_type, column_comment, is_nullable,
            character_maximum_length, ordinal_position, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          configId,
          f.columnName || null,
          columnType || null,
          f.fieldComment || null,
          f.isRequired ? "NO" : "YES",
          f.maxLength ?? null,
          f.fieldSort ?? i + 1,
          now,
          now,
        ]
      );
    }

    return true;
  }

  async deleteGenConfig(tableName: string) {
    const cfgRows = await this.dataSource.query(
      `SELECT id
       FROM gen_table
       WHERE table_name = ? AND is_deleted = b'0'
       LIMIT 1`,
      [tableName]
    );
    const configId = cfgRows?.[0]?.id ? Number(cfgRows[0].id) : null;
    if (!configId) {
      return true;
    }

    await this.dataSource.query(`DELETE FROM gen_table_column WHERE table_id = ?`, [configId]);
    await this.dataSource.query(
      `UPDATE gen_table
       SET is_deleted = b'1', update_time = ?
       WHERE id = ?`,
      [new Date(), configId]
    );

    return true;
  }

  async getPreview(
    tableName: string,
    pageType: "classic" | "curd" = "classic"
  ): Promise<CodegenPreviewVo[]> {
    const config = await this.getGenConfig(tableName);
    const fieldConfigs = config.fieldConfigs || [];

    const previews: CodegenPreviewVo[] = [];
    for (const [templateName, templateConfig] of Object.entries(this.templateConfigs) as [
      TemplateName,
      TemplateConfig,
    ][]) {
      const fileName = this.getFileName(config.entityName!, templateName, templateConfig.extension);
      const filePath = this.getFilePath(
        templateName,
        config.moduleName!,
        config.packageName!,
        templateConfig.subpackageName,
        config.entityName!
      );

      const content = this.renderTemplate(
        templateName,
        templateConfig,
        config,
        fieldConfigs,
        pageType
      );
      previews.push({ path: filePath, fileName, content });
    }

    return previews;
  }

  async downloadZip(tableNames: string[], pageType: "classic" | "curd" = "classic") {
    const zip = new JSZip();

    for (const tableName of tableNames) {
      const list = await this.getPreview(tableName, pageType);
      for (const item of list) {
        const zipPath = `${item.path}/${item.fileName}`.replace(/\\/g, "/");
        zip.file(zipPath, item.content);
      }
    }

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    return { fileName: this.codegenConfig.downloadFileName, buffer };
  }

  private renderTemplate(
    templateName: TemplateName,
    templateConfig: TemplateConfig,
    config: GenConfigFormDto,
    fieldConfigs: FieldConfigDto[],
    pageType: "classic" | "curd"
  ) {
    let templatePath = templateConfig.templatePath;
    if (templateName === "VIEW" && pageType === "curd" && templatePath.endsWith("index.vue.vm")) {
      templatePath = templatePath.replace("index.vue.vm", "index.curd.vue.vm");
    }

    const absTemplatePath = resolveBootTemplatePath(templatePath);
    const tpl = fs.readFileSync(absTemplatePath, "utf8");

    const entityName = config.entityName || "";
    const bindMap: any = {
      packageName: config.packageName,
      moduleName: config.moduleName,
      subpackageName: templateConfig.subpackageName,
      date: formatDateTime(new Date()),
      entityName,
      tableName: config.tableName,
      author: config.author,
      entityLowerCamel: lowerFirst(entityName),
      entityKebab: toKebabCase(entityName),
      entityUpperSnake: toSnakeUpper(entityName),
      businessName: config.businessName,
      fieldConfigs: fieldConfigs.map((f) => this.toTemplateFieldConfig(f)),
    };

    return (Velocity as any).render(tpl, bindMap);
  }

  private toTemplateFieldConfig(field: FieldConfigDto) {
    const javaType = field.fieldType || getJavaTypeByColumnType(field.columnType || "");
    return {
      ...field,
      javaType,
      fieldType: javaType,
      tsType: getTsTypeByJavaType(javaType),
      // Velocity 模板在比较时使用字符串枚举名
      formType: getFormTypeName(field.formType),
      queryType: getQueryTypeName(field.queryType),
    };
  }

  private getFileName(entityName: string, templateName: TemplateName, extension: string) {
    if (templateName === "Entity") {
      return `${entityName}${extension}`;
    }
    if (templateName === "MapperXml") {
      return `${entityName}Mapper${extension}`;
    }
    if (templateName === "API") {
      return `${toKebabCase(entityName)}${extension}`;
    }
    if (templateName === "API_TYPES") {
      return `${toKebabCase(entityName)}${extension}`;
    }
    if (templateName === "VIEW") {
      return "index.vue";
    }
    return `${entityName}${templateName}${extension}`;
  }

  private getFilePath(
    templateName: TemplateName,
    moduleName: string,
    packageName: string,
    subpackageName: string,
    entityName: string
  ) {
    const backend = this.codegenConfig.backendAppName;
    const frontend = this.codegenConfig.frontendAppName;

    let p: string;
    if (templateName === "MapperXml") {
      p = path.join(backend, "src", "main", "resources", subpackageName, moduleName);
    } else if (templateName === "API") {
      p = path.join(frontend, "src", subpackageName, moduleName);
    } else if (templateName === "API_TYPES") {
      p = path.join(frontend, "src", "types", "api");
    } else if (templateName === "VIEW") {
      p = path.join(frontend, "src", subpackageName, moduleName, toKebabCase(entityName));
    } else {
      p = path.join(
        backend,
        "src",
        "main",
        "java",
        ...packageName.split("."),
        moduleName,
        ...subpackageName.split(".")
      );
    }

    return p;
  }
}

function resolveBootTemplatePath(templatePath: string) {
  // Use the local repo templates directory only. Templates should be placed at:
  //   <project-root>/src/platform/codegen/templates/<templatePath>
  const p = path.resolve(process.cwd(), "src", "platform", "codegen", "templates", templatePath);

  if (fs.existsSync(p)) {
    return p;
  }

  throw new Error(
    `Codegen template not found: '${templatePath}'. Expected location:\n  - ${p}\n\n` +
      `Please place templates under 'src/platform/codegen/templates'.`
  );
}

function lowerFirst(s: string) {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function toCamelCase(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[_-](\w)/g, (_, c) => String(c).toUpperCase());
}

function toPascalCase(s: string) {
  const c = toCamelCase(s);
  return c ? c.charAt(0).toUpperCase() + c.slice(1) : c;
}

function toKebabCase(s: string) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
}

function toSnakeUpper(s: string) {
  return String(s)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/-/g, "_")
    .toUpperCase();
}

function formatDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function normalizeColumnType(columnType: string) {
  const normalized = String(columnType || "")
    .trim()
    .toLowerCase()
    .replace(/unsigned/g, "")
    .replace(/zerofill/g, "")
    .replace(/\(.*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized;
}

function getJavaTypeByColumnType(columnType: string) {
  const t = normalizeColumnType(columnType);
  switch (t) {
    case "varchar":
    case "char":
    case "text":
    case "json":
      return "String";
    case "blob":
      return "byte[]";
    case "int":
    case "tinyint":
    case "smallint":
    case "mediumint":
      return "Integer";
    case "bigint":
      return "Long";
    case "float":
      return "Float";
    case "double":
      return "Double";
    case "decimal":
      return "BigDecimal";
    case "date":
      return "LocalDate";
    case "datetime":
    case "timestamp":
      return "LocalDateTime";
    case "boolean":
    case "bit":
      return "Boolean";
    default:
      return "String";
  }
}

function getTsTypeByJavaType(javaType: string) {
  switch (javaType) {
    case "String":
      return "string";
    case "Integer":
    case "Long":
    case "Float":
    case "Double":
    case "BigDecimal":
      return "number";
    case "Boolean":
      return "boolean";
    case "byte[]":
      return "Uint8Array";
    case "LocalDate":
    case "LocalDateTime":
      return "string";
    default:
      return "any";
  }
}

function getDefaultFormTypeByColumnType(columnType: string) {
  const t = normalizeColumnType(columnType);
  if (t === "date") return 8;
  if (t === "datetime" || t === "timestamp") return 9;
  return 1;
}

function getFormTypeName(value?: number) {
  switch (value) {
    case 1:
      return "INPUT";
    case 2:
      return "SELECT";
    case 3:
      return "RADIO";
    case 4:
      return "CHECK_BOX";
    case 5:
      return "INPUT_NUMBER";
    case 6:
      return "SWITCH";
    case 7:
      return "TEXT_AREA";
    case 8:
      return "DATE";
    case 9:
      return "DATE_TIME";
    case 10:
      return "HIDDEN";
    default:
      return "INPUT";
  }
}

function getQueryTypeName(value?: number) {
  switch (value) {
    case 1:
      return "EQ";
    case 2:
      return "LIKE";
    case 3:
      return "IN";
    case 4:
      return "BETWEEN";
    case 5:
      return "GT";
    case 6:
      return "GE";
    case 7:
      return "LT";
    case 8:
      return "LE";
    case 9:
      return "NE";
    case 10:
      return "LIKE_LEFT";
    case 11:
      return "LIKE_RIGHT";
    default:
      return "EQ";
  }
}
