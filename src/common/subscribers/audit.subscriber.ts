import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from "typeorm";
import { RequestContext } from "../context/request-context";

/**
 * 审计字段自动填充订阅器
 * 在实体插入和更新时自动填充 createBy、updateBy、createTime、updateTime 字段
 */
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  /**
   * 监听所有实体事件
   */
  listenTo() {
    return Object;
  }

  /**
   * 插入前：自动填充 createBy、createTime、updateBy、updateTime
   */
  beforeInsert(event: InsertEvent<any>): void {
    const entity = event.entity;
    if (!entity) return;

    const now = new Date();
    const userId = RequestContext.getUserId();

    // 填充创建人
    if (userId && this.hasField(entity, "createBy", event)) {
      entity.createBy = userId;
    }

    // 填充创建时间
    if (this.hasField(entity, "createTime", event) && !entity.createTime) {
      entity.createTime = now;
    }

    // 填充修改人（新建时也设置）
    if (userId && this.hasField(entity, "updateBy", event)) {
      entity.updateBy = userId;
    }

    // 填充更新时间（新建时也设置）
    if (this.hasField(entity, "updateTime", event) && !entity.updateTime) {
      entity.updateTime = now;
    }
  }

  /**
   * 更新前：自动填充 updateBy、updateTime
   */
  beforeUpdate(event: UpdateEvent<any>): void {
    const entity = event.entity;
    if (!entity) return;

    const now = new Date();
    const userId = RequestContext.getUserId();

    // 填充修改人
    if (userId && this.hasField(entity, "updateBy", event)) {
      entity.updateBy = userId;
    }

    // 填充更新时间
    if (this.hasField(entity, "updateTime", event)) {
      entity.updateTime = now;
    }
  }

  /**
   * 检查实体是否应该填充指定字段
   * 通过检查实体元数据（来自 TypeORM 装饰器）来判断实体是否有该字段
   */
  private hasField(
    entity: any,
    field: string,
    event: InsertEvent<any> | UpdateEvent<any>
  ): boolean {
    // 使用 TypeORM 元数据检查字段是否存在
    const metadata = (() => {
      try {
        if (event?.metadata) return event.metadata;
        return event.connection.getMetadata(entity.constructor);
      } catch {
        return null;
      }
    })();
    if (metadata) {
      const hasColumn = metadata.columns.some((col) => col.propertyName === field);
      if (hasColumn) return true;
    }
    // 回退到实例属性检查
    return field in entity || Object.prototype.hasOwnProperty.call(entity, field);
  }
}
