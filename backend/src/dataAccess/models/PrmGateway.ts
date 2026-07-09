import { RowDataPacket } from 'mysql2';

export interface Partner extends RowDataPacket {
  id: string;
  partner_type: string;
  partner_name: string;
  partner_email: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface SyncStatus extends RowDataPacket {
  type: string;
  last_executed_at: Date | null;
}

export enum SyncStatusType {
  SYNCED = 'synced',
  ABLE_TO_SYNC = 'able_to_sync',
}

export interface SyncStatusGroup extends RowDataPacket {
  customer_id: string;
  sync_statuses: string;
}

export interface Customer extends RowDataPacket {
  id: number;
  partner_id: string;
  customer_id: string;
  customer_email: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  sync_status: SyncStatusType | null;
}

export interface Subscription extends RowDataPacket {
  id: string;
  partner_id: string;
  customer_id: string;
  subscription_id: string;
  env: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
