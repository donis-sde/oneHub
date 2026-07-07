import mongoose from 'mongoose';

export enum MongooseExtendedTypeEnum {
  NULL = 'null',
  UNSET = 'unset',
  MAP = 'Embedded', // Map
}

export type MongooseExtendedType =
  | MongooseExtendedTypeEnum.NULL
  | MongooseExtendedTypeEnum.UNSET
  | MongooseExtendedTypeEnum.MAP
  | (typeof mongoose.Schema.Types.Array)['schemaName']
  | (typeof mongoose.Schema.Types.Boolean)['schemaName']
  | (typeof mongoose.Schema.Types.Buffer)['schemaName']
  | (typeof mongoose.Schema.Types.Date)['schemaName']
  | (typeof mongoose.Schema.Types.Decimal128)['schemaName']
  | (typeof mongoose.Schema.Types.DocumentArray)['schemaName']
  | (typeof mongoose.Schema.Types.Map)['schemaName']
  // | (typeof mongoose.Schema.Types.Mixed)['schemaName']
  | (typeof mongoose.Schema.Types.Number)['schemaName']
  | (typeof mongoose.Schema.Types.ObjectId)['schemaName']
  // | (typeof mongoose.Schema.Types.Subdocument)['schemaName']
  | (typeof mongoose.Schema.Types.String)['schemaName']
  | (typeof mongoose.Schema.Types.UUID)['schemaName'];

export const isMongooseExtendedType = (
  v: unknown,
): v is MongooseExtendedType => {
  return (
    v === MongooseExtendedTypeEnum.NULL ||
    v === MongooseExtendedTypeEnum.UNSET ||
    v === MongooseExtendedTypeEnum.MAP ||
    v === mongoose.Schema.Types.Array.schemaName ||
    v === mongoose.Schema.Types.Boolean.schemaName ||
    v === mongoose.Schema.Types.Buffer.schemaName ||
    v === mongoose.Schema.Types.Date.schemaName ||
    v === mongoose.Schema.Types.Decimal128.schemaName ||
    v === mongoose.Schema.Types.DocumentArray.schemaName ||
    v === mongoose.Schema.Types.Map.schemaName ||
    v === mongoose.Schema.Types.Mixed.schemaName ||
    v === mongoose.Schema.Types.Number.schemaName ||
    v === mongoose.Schema.Types.ObjectId.schemaName ||
    v === mongoose.Schema.Types.Subdocument.schemaName ||
    v === mongoose.Schema.Types.String.schemaName ||
    v === mongoose.Schema.Types.UUID.schemaName
  );
};
