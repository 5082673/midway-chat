import { prop, modelOptions } from '@typegoose/typegoose';

class BaseEntity {
    // @prop({ required: true })
    // public id?: chatList;
    @prop({ required: true, default: new Date().getTime() })
    public createTime?: number;
    @prop({ required: true, default: new Date().getTime() })
    public updateTime?: number;
}

// 人员列表
@modelOptions({
    options: {
        customName: '人员列表',
        automaticName: false,
    },
    schemaOptions: {
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
class user_child_list extends BaseEntity {
    @prop({ text: 'userid', required: false })
    public user_id?: string;

    @prop({ text: 'nick_name', required: false, default: '' })
    public nick_name?: string;
}

enum msgType {
    text = 'text',
    image = 'image',
    mp4 = 'mp4',
    mp3 = 'mp3',
    voice = 'voice',
    word = 'word',
    file = 'file',
    goods = 'goods',
}

// 聊天记录表
@modelOptions({
    options: {
        customName: '聊天记录表',
        automaticName: false,
    },
    schemaOptions: {
        collection: 'chatList',
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
export class chatList extends BaseEntity {
    // @prop({ text: '接受消息人的userid', required: true })
    // public ascriptionId?: string;

    @prop({ text: '发送人id', required: true })
    public sendUserId?: string;

    @prop({ text: '聊天室id', required: true })
    public groupId?: string;

    @prop({ text: '消息类型', required: true, enum: msgType })
    public msgType?: string;

    @prop({ text: '消息内容', required: true })
    public content?: string;

    @prop({ text: '历史消息内容', required: true })
    public oldContent?: string;

    @prop({ text: '是否已读 0 => 未读; 1 => 已读', required: false, default: 0 })
    public readType?: number;

    @prop({ text: '已读群成员userid', required: false, type: () => user_child_list })
    public read_child_list?: user_child_list[];

    @prop({ text: '是否撤回 0 => 未撤回; 1 => 已撤回', required: false, default: 0 })
    public withdrawType?: number;

    @prop({ text: '状态 0=> 正常 1=> 删除', required: false, default: 0 })
    public status?: number;
}

// 群组列表
@modelOptions({
    options: {
        customName: '群组列表',
        automaticName: false,
    },
    schemaOptions: {
        collection: 'chat_group',
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
export class chat_group extends BaseEntity {
    @prop({ text: '群组名称', required: true })
    public name?: string;

    @prop({ text: '群头像', required: false, default: '' })
    public avatar?: string;

    @prop({ text: '群主id', required: true })
    public user_id?: string;

    @prop({ text: '子管理员id', required: false, type: () => [String] })
    public admin_user_id?: string[];

    @prop({ text: '群成员userid', required: false, type: () => [String] })
    public user_child_id?: string[];

    @prop({ text: '群成员列表', required: false, type: () => user_child_list })
    public user_child_list?: user_child_list[];

    @prop({ text: '被拉黑人的userid', required: false, type: () => [String] })
    public black_id?: string[];

    @prop({ text: '最新群公告', required: false, default: '' })
    public remark?: string;

    @prop({ text: '群组类别，0 单聊 1 多聊 2 客服', required: false, default: 0 })
    public type?: number;

    @prop({ text: '状态 0正常 1禁用 2拉黑 3禁言', required: false, default: 0 })
    public status?: number;

    @prop({ required: false, default: 0, text: '最新消息时间' })
    public newsContentTime?: number;

    @prop({ required: false, default: '', text: '最新消息' })
    public newsContent?: string;

    @prop({ required: false, default: '', text: '最新消息id' })
    public newsContentId?: string;
}

// 群组公告列表
@modelOptions({
    options: {
        customName: '群组公告列表',
        automaticName: false,
    },
    schemaOptions: {
        collection: 'group_remark_list',
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
export class group_remark_list extends BaseEntity {
    @prop({ text: '聊天室id', required: true })
    public groupId?: string;

    @prop({ text: '最新群公告', required: false, default: '' })
    public remark?: string;

    @prop({ text: 'user_id', required: false, default: '' })
    public user_id?: string;

    @prop({ text: '已读群成员userid', required: false, type: () => user_child_list })
    public user_child_list?: user_child_list[];
}

// 好友申请列表
@modelOptions({
    options: {
        customName: '好友申请列表',
        automaticName: false,
    },
    schemaOptions: {
        collection: 'mail_apply_list',
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
export class mail_apply_list extends BaseEntity {
    @prop({ text: 'user_id', required: false, default: '' })
    public user_id?: string;

    @prop({ text: '对方user_id', required: false, default: '' })
    public user_from_id?: string;

    @prop({ text: '好友申请备注', required: false, default: '' })
    public remark?: string;

    @prop({ text: '群组id', required: false, default: '' })
    public group_id?: string;

    @prop({ text: '0 未同意 1已同意 2已拒绝', required: false, default: 0 })
    public status?: number;
}

// 分享群 邀请好友进入
@modelOptions({
    options: {
        customName: '分享群邀请列表',
        automaticName: false,
    },
    schemaOptions: {
        collection: 'share_group_list',
        timestamps: false,
        toJSON: {
            transform: (doc: DocumentType, ret) => {
                delete ret.__v;
                ret.id = ret._id;
                delete ret._id;
            },
        },
    },
})
export class share_group_list extends BaseEntity {
    @prop({ text: 'user_id', required: false, default: '' })
    public user_id?: string;

    @prop({ text: '聊天室id', required: true })
    public groupId?: string;

    @prop({ text: '邀请备注', required: false, default: '' })
    public remark?: string;

    @prop({ text: '超时时间', required: false, default: 0 })
    public overtime?: number;
}

export const mongodb = [chatList, chat_group, group_remark_list, mail_apply_list, share_group_list];
