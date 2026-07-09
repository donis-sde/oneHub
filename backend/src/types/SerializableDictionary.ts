export type StringToTypeLookup = {
  string: string;
  number: number;
  boolean: boolean;
  'string[]': string[];
  'number[]': number[];
  'boolean[]': boolean[];
  undefined: undefined;
  null: null;
  json: CircularSerializableDictionary;
  'json[]': CircularSerializableDictionary[];
};

export type SerializableType =
  | string
  | number
  | boolean
  | CircularSerializableDictionary
  | null
  | string[]
  | number[]
  | boolean[]
  | CircularSerializableDictionary[];
export type SerializableDictionary = Record<string, SerializableType>;

// for circular reference
// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface CircularSerializableDictionary extends SerializableDictionary {}
