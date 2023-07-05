import { Inject, Provide } from '@midwayjs/decorator';
// import { chat_group } from '../mongodb/mysql/chat_group';
// import { chat_group_user_list } from '../mongodb/mysql/chat_group_user_list';
// import { InjectEntityModel, TypeORMDataSourceManager } from '@midwayjs/typeorm';
// import { Repository } from 'typeorm';
import { Api } from '../../../common/util/api';
import { ReturnModelType } from '@typegoose/typegoose';
import { InjectEntityModel as typegooseInjectEntityModel } from '@midwayjs/typegoose';
import { chat_group as oose_chat_group, group_remark_list, chatList, share_group_list } from '../model/mongodb';
import { userService } from '../../user/service/user';
import { SocketService } from './socket';

@Provide()
export class GroupService {
    // @InjectEntityModel(chat_group_user_list)
    // chat_group_user_list_model: Repository<chat_group_user_list>;
    @Inject() Common: Api;
    @Inject() requestService: userService;
    // @InjectEntityModel(chat_group)
    // chat_group_model: Repository<chat_group>;
    // @Inject()
    // dataSourceManager: TypeORMDataSourceManager;
    @typegooseInjectEntityModel(oose_chat_group) groupModel: ReturnModelType<typeof oose_chat_group>;
    @typegooseInjectEntityModel(group_remark_list) group_remark_list_model: ReturnModelType<typeof group_remark_list>;
    @typegooseInjectEntityModel(chatList) chatList_model: ReturnModelType<typeof chatList>;
    @typegooseInjectEntityModel(share_group_list) share_group_list_model: ReturnModelType<typeof share_group_list>;
    @Inject() socketService: SocketService;

    // 首次单聊获取群组id
    async getFirstGroupId({ ascriptionId = '', sendUserId = '' }) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            const user_child_id = [ascriptionId, sendUserId];
            const groupData = await this.groupModel.findOne({ user_child_id: { $all: user_child_id }, type: 0 }).select('user_id status');
            if (groupData) {
                if (groupData.status === 1) {
                    return reject({
                        data: '',
                        msg: '好友关系禁用',
                    });
                }
                if (groupData.status === 2) {
                    return reject({
                        data: '已拉黑',
                        msg: groupData.black_id.includes(String(sendUserId)) ? '对方已将你拉黑' : '您已将对方拉黑',
                    });
                }
                return resolve({ data: { id: groupData.id, user_id: groupData.user_id } });
            } else {
                const groupData: oose_chat_group | any = await this.groupModel.create({
                    name: `group_${sendUserId}_${ascriptionId}`, // 群组名称 可查询用户名字
                    avatar: '', // 群头像
                    user_id: sendUserId, // 群主id
                    user_child_id: [sendUserId, ascriptionId], // 群成员id
                    user_child_list: [
                        { user_id: sendUserId, createTime: new Date().getTime(), updateTime: new Date().getTime() },
                        { user_id: ascriptionId, createTime: new Date().getTime(), updateTime: new Date().getTime() },
                    ],
                    createTime: new Date().getTime(),
                    updateTime: new Date().getTime(),
                } as oose_chat_group);
                resolve({ data: { id: groupData.id, user_id: groupData.user_id } });

                // 创建会话
                // const mongoSession = await mongoose.startSession();
                // await mongoSession.startTransaction();
                // try {
                //     // 提交事务
                //     await mongoSession.commitTransaction();
                // } catch (err) {
                //     console.log(err);
                //     reject({ data: '获取群组信息失败' });
                // } finally {
                //     // 在服务器上结束此会话
                //     mongoSession.endSession();
                // }
            }
        });
    }

    // 查询是否属于本群组
    async getGroupUser({ id = '', user_id = '', select = [] }) {
        const data: any = await this.groupModel
            .findOne({ _id: id, 'user_child_list.user_id': String(user_id) })
            .select(select)
            .exec();
        if (data && data._doc) {
            for (const i in data._doc.user_child_list) {
                const res: any = data._doc.user_child_list[i]._doc;
                try {
                    const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                    res.nick_name = userData.name;
                    Object.keys(userData).forEach(key => {
                        res[key] = userData[key];
                    });
                } catch (e) {}
            }
        }
        return data;
    }

    // 查询群组信息
    async getGroup({ id = '', select = [] }) {
        const data: any = await this.groupModel.findById(id).select(select).exec();
        if (data && data._doc) {
            for (const i in data._doc.user_child_list) {
                const res: any = data._doc.user_child_list[i]._doc;
                try {
                    const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                    res.nick_name = userData.name;
                    Object.keys(userData).forEach(key => {
                        res[key] = userData[key];
                    });
                } catch (e) {}
            }
        }
        return data;
    }

    // 查找符合条件的群组信息
    async getLikeGroup(postData = {}, type = 'one', select = []): Promise<any> {
        let data = null;
        switch (type) {
            case 'one':
                data = await this.groupModel.findOne(postData).select(select).exec();
                if (data && data._doc) {
                    for (const i in data._doc.user_child_list) {
                        const res: any = data._doc.user_child_list[i]._doc;
                        try {
                            const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                            res.nick_name = userData.name;
                            Object.keys(userData).forEach(key => {
                                res[key] = userData[key];
                            });
                        } catch (e) {}
                    }
                }
                break;
            case 'all':
                data = await this.groupModel.find(postData).select(select).exec();
                if (data && data.length > 0) {
                    for (const i in data) {
                        const obj = data[i]._doc;
                        if (obj.user_child_list && obj.user_child_list.length > 0) {
                            for (const a in obj.user_child_list) {
                                const res: any = obj.user_child_list[a]._doc;
                                try {
                                    const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                                    res.nick_name = userData.name;
                                    Object.keys(userData).forEach(key => {
                                        res[key] = userData[key];
                                    });
                                } catch (e) {}
                            }
                        }
                    }
                }
                break;
        }
        return data;
    }

    // 获取未读消息数
    async getGroupUnreadCount(groupId = '', postData = {}) {
        return await this.chatList_model.find({ ...postData, readType: 0, groupId }).count();
    }

    // 群聊获取未读消息数
    async getGroupChatUnreadCount({ groupId = '', postData = {}, userId = '' }) {
        const data = await this.chatList_model
            .find({
                ...postData,
                // readType: 0,
                groupId,
                // 已读人员没有自己
                'read_child_list.user_id': { $ne: String(userId) },
                // 发送消息人员 不是自己
                sendUserId: { $ne: String(userId) },
                type: 1,
            })
            .count();
        return data;
    }

    // 查询群组列表
    // async getGroupList({ postData = {}, limit = 10, page = 1 }) {
    //     const num: number = Number(page) * limit - limit;
    //     return await this.groupModel.find(postData).limit(limit).skip(num).sort({ newsContentTime: 'desc' });
    // }

    /**
     * 创建群组
     * */
    async createGroup(postData = {}) {
        const data: oose_chat_group = await this.groupModel.create({ ...postData, createTime: new Date().getTime(), updateTime: new Date().getTime() } as oose_chat_group);
        return data;
    }

    // 修改群组信息
    async updGroup({ id = '', updData = {} }): Promise<any> {
        return await this.groupModel.updateOne({ _id: id }, updData);
    }

    // 设置群公告
    async setRemarks({ groupId = '', remark = '', user_id }): Promise<any> {
        return await this.group_remark_list_model.create({
            groupId,
            remark,
            createTime: new Date().getTime(),
            updateTime: new Date().getTime(),
            user_id,
        } as group_remark_list);
    }

    // 获取群公告列表
    async getRemarkList({ groupId = '', limit = 10, page = 1 }) {
        const num: number = Number(page) * limit - limit;
        const data: any[] = await this.group_remark_list_model.find({ groupId }).limit(limit).skip(num).sort({ createTime: 'desc' });
        const count = await this.group_remark_list_model.find({ groupId }).count();
        if (data && data.length > 0) {
            for (const i in data) {
                const obj = data[i]._doc;
                if (obj.user_child_list && obj.user_child_list.length > 0) {
                    for (const a in obj.user_child_list) {
                        const res: any = obj.user_child_list[a]._doc;
                        try {
                            const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                            res.nick_name = userData.name;
                            Object.keys(userData).forEach(key => {
                                res[key] = userData[key];
                            });
                        } catch (e) {}
                    }
                }
            }
        }
        return { data, count };
    }

    // 查看群公告详情
    async getRemark({ id = '' }) {
        const data: any = await this.group_remark_list_model.findById(id);
        if (data && data._doc) {
            for (const i in data._doc.user_child_list) {
                const res: any = data._doc.user_child_list[i]._doc;
                try {
                    const userData = await this.requestService.findUserDataRequest({ user_id: res.user_id });
                    res.nick_name = userData.name;
                    Object.keys(userData).forEach(key => {
                        res[key] = userData[key];
                    });
                } catch (e) {}
            }
        }
        return data;
    }

    // 添加群公告信息已读人员
    async addRemarkReadUser({ id = '', user_id = '' }): Promise<any> {
        return await this.group_remark_list_model
            .updateOne(
                { _id: id },
                {
                    $push: {
                        user_child_list: {
                            user_id,
                            createTime: new Date().getTime(),
                            updateTime: new Date().getTime(),
                        },
                    },
                }
            )
            .exec();
    }

    // 创建分享群邀请好友数据
    async group_share_add({ groupId = '', remark = '', overtime = 0, user_id = '' }): Promise<any> {
        return await this.share_group_list_model.create({
            user_id,
            createTime: new Date().getTime(),
            updateTime: new Date().getTime(),
            remark,
            overtime,
            groupId,
        } as share_group_list);
    }

    // 查询分享群邀请好友数据
    async get_group_share({ id = '' }): Promise<any> {
        return await this.share_group_list_model.findById(id).exec();
    }

    // 添加群成员
    async group_add_user({ groupId = '', user_id = '', user_child_id = [] }) {
        user_child_id.push(user_id);
        const updData = {
            user_child_id,
            $push: {
                user_child_list: {
                    user_id: user_id,
                    createTime: new Date().getTime(),
                    updateTime: new Date().getTime(),
                },
            },
        };
        await this.updGroup({ id: groupId, updData });
        // 通知人员
        await this.socketService.groupAddUserMsg({ expand: { groupId, user_id }, user_id: user_child_id });
        return true;
    }

    /**
     * 删除群组
     * */
    async group_del({ groupId = '' }) {
        return await this.updGroup({ id: groupId, updData: { status: 1 } });
    }

    // async getFirstGroupId1({ ascriptionId = '', sendUserId = '' }) {
    //     // eslint-disable-next-line no-async-promise-executor
    //     return new Promise(async (resolve, reject) => {
    //         const groupListData: { group_id: 0 } = await this.chat_group_user_list_model
    //             .createQueryBuilder()
    //             .select('group_id')
    //             .where(`user_id = ${ascriptionId} and group_type = 0`)
    //             .where(`user_id = ${sendUserId} and group_type = 0`)
    //             .getRawOne();
    //
    //         if (groupListData) {
    //             const groupData: any = await this.chat_group_model.createQueryBuilder().select('id,name,user_id,status').where(`id = ${groupListData.group_id}`).getRawOne();
    //             if (!groupData) {
    //                 return reject({ data: '暂无群组信息', msg: '暂无群组信息' });
    //             }
    //             if (groupData.status === 2) {
    //                 return reject({
    //                     data: '已拉黑',
    //                     msg: String(groupData.black_id) === String(sendUserId) ? '对方已将你拉黑' : '您已将对方拉黑',
    //                 });
    //             }
    //             // 正常的群组 status === 0
    //             return resolve({ data: groupData });
    //         }
    //
    //         const dataSource = this.dataSourceManager.getDataSource('default');
    //         await dataSource
    //             .transaction(async transactionalEntityManager => {
    //                 // 创建群组
    //                 const groupSaveData: any = await transactionalEntityManager.save(chat_group, {
    //                     name: `group_${sendUserId}_${ascriptionId}`, // 群组名称 可查询用户名字
    //                     avatar: '', // 群头像
    //                     user_id: sendUserId, // 群组id
    //                     type: 0,
    //                     status: 0,
    //                 });
    //                 // 添加群成员
    //                 await transactionalEntityManager.save(chat_group_user_list, [
    //                     {
    //                         group_id: groupSaveData.id,
    //                         user_id: sendUserId,
    //                         type: 1,
    //                         group_type: 0,
    //                         status: 0,
    //                     },
    //                     {
    //                         group_id: groupSaveData.id,
    //                         user_id: ascriptionId,
    //                         type: 0,
    //                         group_type: 0,
    //                         status: 0,
    //                     },
    //                 ]);
    //                 resolve({ data: groupSaveData });
    //             })
    //             .catch(err => {
    //                 console.log(err);
    //                 // console.log(err);
    //                 reject({ data: '获取群组信息失败' });
    //             });
    //     });
    // }
}
