import { PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export class BaseEntity {
    @PrimaryGeneratedColumn({ comment: '主键' })
    id: number;

    @CreateDateColumn({
        type: 'timestamp',
        comment: '创建时间',
    })
    create_time: string;

    @UpdateDateColumn({
        type: 'timestamp',
        comment: '修改时间',
    })
    update_time: string;

    @DeleteDateColumn({
        type: 'timestamp',
        comment: '删除时间',
    })
    delete_time: string;
}
