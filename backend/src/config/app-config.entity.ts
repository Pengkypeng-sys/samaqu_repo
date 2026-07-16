import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('app_config')
export class AppConfig {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text' })
  value: string;
}
