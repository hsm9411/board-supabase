import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('cached_users', { schema: 'board_schema' })
export class CachedUser {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  nickname: string;

  @UpdateDateColumn({ name: 'last_synced_at' })
  lastSyncedAt: Date;
}