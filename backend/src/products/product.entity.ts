import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  series: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock_qty: number;

  @Column({ type: 'jsonb', nullable: true })
  size_variants: Record<string, number>; // { S: 10, M: 5, L: 0 }
}
