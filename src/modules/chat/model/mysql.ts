import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/util/BaseEntity';

/**
 * 群组列表
 * */
@Entity({ name: 'chat_group' })
export class chat_group extends BaseEntity {
    @Column({ comment: '群组名称', default: '', nullable: true })
    name: string;

    @Column({ comment: '群头像', default: '' })
    avatar: string;

    @Column({ comment: '群主id', nullable: false })
    user_id: string;

    @Column({ comment: '被拉黑人的userid', nullable: false, default: '' })
    block_id: string;

    @Column({ comment: '群公告', type: 'text', nullable: true })
    remark: string;

    @Column({ comment: '群组类别，0 单聊 1 多聊 2 客服', default: 0 })
    type: number;

    @Column({ comment: '状态 0正常 1禁用 2拉黑', default: 0 })
    status: number;
}

/**
 * 群组用户数据表
 * */
@Entity({ name: 'chat_group_user_list' })
export class chat_group_user_list extends BaseEntity {
    @Column({ comment: '群组id', nullable: false })
    group_id: string;

    @Column({ comment: '群成员id', nullable: false })
    user_id: string;

    @Column({ comment: '是否是群主 0否 1是', default: 0 })
    type: number;

    @Column({ comment: '群组类别，0 单聊 1 多聊 2 客服', default: 0 })
    group_type: number;

    @Column({ comment: '状态 0正常 1禁用', default: 0 })
    status: number;
}

export const mysql = [chat_group, chat_group_user_list];
