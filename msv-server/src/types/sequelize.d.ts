import { Model } from 'sequelize';

declare module 'sequelize' {
  interface ModelCtor<M extends Model> {
    findAll(): Promise<M[]>;
    findOne(): Promise<M | null>;
    create(values?: any): Promise<M>;
    bulkCreate(records: any[]): Promise<M[]>;
    findAndCountAll(options?: any): Promise<{ rows: M[]; count: number }>;
    destroy(options?: any): Promise<number>;
    update(values: any, options?: any): Promise<[number, M[]]>;
    upsert(values: any): Promise<M>;
  }
}
