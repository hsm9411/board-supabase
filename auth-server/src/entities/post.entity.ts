import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string; // (참고: 위 코드에 있던 빈 줄 제거함)

  @Column('text')
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'is_public', default: true })
  isPublic: boolean;

  // 👇 [중요 변경 포인트]
  @ManyToOne(() => User, user => user.posts, {
    onDelete: 'CASCADE',  // 1. 유저가 탈퇴(삭제)하면 작성한 글도 같이 삭제됨
    nullable: false       // 2. 작성자 없는 글은 생성 불가 (필수값 설정)
  })
  @JoinColumn({ name: 'author_id' }) // 3. DB 컬럼 이름을 'authorId' 대신 'author_id'로 고정
  author: User;
}