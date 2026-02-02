import { Entity, PrimaryColumn, Column } from 'typeorm';

/**
 * Board Service에서 JWT 검증용으로만 사용하는 User Entity
 *
 * 특징:
 * - auth_schema를 명시적으로 지정 (스키마 분리)
 * - password 필드 제외 (Board에서 불필요)
 * - Read-only로 사용 (Auth Service가 관리)
 *
 * 용도:
 * - JwtStrategy.validate()가 반환하는 객체 타입
 * - @GetUser() 데코레이터를 통해 Controller에서 사용
 */
@Entity('users', { schema: 'auth_schema' })
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  nickname: string;

  @Column({ name: 'created_at' })
  createdAt: Date;
}
