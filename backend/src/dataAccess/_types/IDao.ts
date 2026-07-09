import { Paginated, Paginator } from '@/types/Pagination';
import { WithId } from 'mongodb';
import { Condition } from 'mongoose';

export interface IDao<Model, Dto> {
  get(id: string): Promise<WithId<Dto> | null>;

  count(
    filter?: Partial<Record<keyof Model, Condition<Model>>>,
  ): Promise<number>;

  insertMany(documents: Partial<Model>[]): Promise<Dto> | Promise<void>;

  list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof Model, Condition<Model>>>,
  ): Promise<Paginated<WithId<Dto>>>;

  updateField(id: string, field: keyof Model, value: unknown): Promise<Model>;

  transformData(data: WithId<Model>): WithId<Dto>;

  updateByFilter(
    filters: Partial<Record<keyof Model, Condition<Model>>>,
    field: keyof Model,
    value: unknown,
    unset: boolean,
  ): Promise<BatchUpdateResult>;
}

export type BatchUpdateResult = {
  matchedCount: number;
  updatedCount: number;
};
