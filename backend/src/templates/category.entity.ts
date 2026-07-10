import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ScriptTemplate } from './script-template.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => ScriptTemplate, (t) => t.category)
  templates: ScriptTemplate[];
}
