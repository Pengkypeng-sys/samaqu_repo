import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Category } from './category.entity';
import { User } from '../users/user.entity';

@Entity('script_templates')
export class ScriptTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Category, (c) => c.templates)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by: User;

  @UpdateDateColumn()
  updated_at: Date;
}
