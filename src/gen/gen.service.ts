import { Injectable } from "@nestjs/common";
import { CreateGenDto } from "./dto/create-gen.dto";
import { UpdateGenDto } from "./dto/update-gen.dto";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Model, Schema } from "mongoose";
@Injectable()
export class GenService {
  private collectionDefinitionModel: Model<any>;
  constructor(@InjectConnection() private connection: Connection) {
    const collectionDefinitionSchema = new Schema({
      collectionName: { type: String, required: true },
      schemaDefinition: { type: Object, required: true },
    });

    // 注册 CollectionDefinitions 模型
    this.collectionDefinitionModel = this.connection.model(
      "CollectionDefinitions",
      collectionDefinitionSchema
    );
  }
  // 保存集合定义到 CollectionDefinitions 模型中
  async saveCollectionDefinition(collectionName: string, schemaDefinition: any): Promise<void> {
    await this.collectionDefinitionModel.create({
      collectionName,
      schemaDefinition,
    });
  }
  create(createGenDto: CreateGenDto) {
    return "This action adds a new gen";
  }
  // 动态创建集合并插入数据
  async createCollectionAndInsertData(
    collectionName: string,
    schemaDefinition: any,
    data: any
  ): Promise<any> {
    console.log(collectionName, schemaDefinition, data);
    // 使用从mongoose模块导入的Schema，而不是connection.Schema
    const schema1 = new Schema(schemaDefinition);
    const model = this.connection.model(collectionName, schema1);
    // 保存到表里
    await this.saveCollectionDefinition(collectionName, schemaDefinition);

    return model.create(data);
  }

  // 在启动时重新加载集合定义并注册模型
  async loadAllCollections(): Promise<void> {
    try {
      const CollectionDefinition = this.connection.model("CollectionDefinitions");
      const collections = await CollectionDefinition.find();

      collections.forEach((collection) => {
        const schema = new Schema(collection.schemaDefinition);
        this.connection.model(collection.collectionName, schema);
      });
    } catch (e) {
      console.log(e);
    }
  }
  // 从指定的表里获取数据
  async getDataFromCollection(collectionName: string): Promise<any[]> {
    const model = this.connection.model(collectionName);
    return model.find().exec();
  }
  findAll() {
    return `This action returns all gen`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gen`;
  }

  update(id: number, updateGenDto: UpdateGenDto) {
    return `This action updates a #${id} gen`;
  }

  remove(id: number) {
    return `This action removes a #${id} gen`;
  }
}
