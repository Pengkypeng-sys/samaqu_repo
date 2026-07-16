import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bank_name: string;

  @Column()
  account_number: string;

  @Column()
  account_holder: string;

  @Column({ default: true })
  is_active: boolean;
}
