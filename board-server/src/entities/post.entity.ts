import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('posts', { schema: 'board_schema' })
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  // ❗ FK 제거, UUID만 저장
  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  // 캐시된 User 정보 (비정규화)
  @Column({ name: 'author_email', nullable: true })
  authorEmail: string;

  @Column({ name: 'author_nickname', nullable: true })
  authorNickname: string;
}