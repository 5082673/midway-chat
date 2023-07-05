import { RedisFunService } from '../../../common/service/redis';
import { Context, Application } from 'egg';
import { App, Inject, Provide } from '@midwayjs/decorator';
import { Api } from '../../../common/util/api';
import { InjectEntityModel } from '@midwayjs/typegoose';
import { ReturnModelType } from '@typegoose/typegoose';
import { chatList } from '../model/mongodb';
import { GroupService } from './group';
import { userService } from '../../user/service/user';
@Provide()
export class SocketService {
    @Inject() ctx: Context;
    @Inject() redis: RedisFunService;
    @Inject() api: Api;
    @App() app: Application;
    @InjectEntityModel(chatList) chatListModel: ReturnModelType<typeof chatList>;

    @Inject() groupService: GroupService;
    @Inject() userService: userService;

    /**
     * 储存聊天数据
     * */
    async setMsg({ message = {} }: { message: { [key: string]: any } }) {
        const { chatListModel, groupService } = this;
        const createTime = new Date().getTime();
        // 存储数据
        const messageData = await chatListModel.create({
            // ascriptionId: message.ascriptionId,
            sendUserId: message.sendUserId,
            groupId: message.groupId,
            msgType: message.msgType,
            content: message.content,
            oldContent: message.content,
            readType: message.readType,
            withdrawType: message.withdrawType,
            createTime,
            updateTime: createTime,
        } as chatList);
        // 修改最新消息至聊天列表（群组）
        await groupService.updGroup({
            id: message.groupId,
            updData: {
                newsContentTime: createTime,
                newsContent: message.content,
                newsContentId: messageData.id,
            },
        });
        return messageData;
    }

    /**
     * 指定人发送消息
     * */
    async send({ toId = '', message = {} }: { toId: string; message: { [key: string]: any } }): Promise<void> {
        // 拿到接受用户所在子进程
        const pid = await this.redis.getUserPid({ key: 'online_' + toId });
        if (pid) {
            const data = {
                sendType: 'send',
                data: message,
                code: 1,
            };
            // 向所在进程的用户ws实例发送消息
            this.app.messenger.sendTo(Number(pid), 'send', { data, user_id: toId });
        }
    }

    /**
     * 群聊发送消息
     * */
    async groupSend({ toIds = [], message = {} }: { toIds: string[]; message: { [key: string]: any } }): Promise<void> {
        const msgData = {
            data: message,
            code: 1,
            sendType: 'groupSend',
        };
        this.app.ws.sendJsonTo(message.groupId, msgData);
        // for (const i in toIds) {
        //     const toId = toIds[i];
        //     // @ts-ignore
        //     if (app.ws.user && app.ws.user[toId]) {
        //         console.log('对方在线');
        //         // message.sendType = 'groupSend';
        //         const msgData = { data: message, code: 1, sendType: 'groupSend' };
        //         // @ts-ignore
        //         app.ws.user[toId].send(JSON.stringify(msgData));
        //     }
        // }
    }

    // 将当前连接加入所拥有的房间
    async userJoinRooms({ user_id = '' }): Promise<void> {
        const { app, groupService } = this;
        const groupData = await groupService.getLikeGroup({ status: [0, 3], type: 1, user_child_id: { $in: [user_id] } }, 'all', ['status']);
        // @ts-ignore
        // const user = app.ws.user;
        // if (user && user[user_id] && groupData && groupData.length > 0) {
        //     for (const i in groupData) {
        //         const id = groupData[i].id;
        //         await user[user_id].room.join(id);
        //     }
        // }
        // 拿到接受用户所在子进程
        const pid = await this.redis.getUserPid({ key: 'online_' + user_id });
        if (pid) {
            const data = {
                user_id,
                groupIds: groupData.map(res => {
                    return res.id;
                }),
            };
            app.messenger.sendTo(Number(pid), 'userJoinRooms', data);
        }
    }

    /**
     * 将指定人员加入指定群组房间
     * */
    async userJoinToRoom({ user_id_arr = [], groupId = '' }): Promise<void> {
        const { app } = this;
        // @ts-ignore
        // const user = this.app.ws.user;
        for (const i in user_id_arr) {
            const user_id = user_id_arr[i];
            // if (user && user[user_id]) {
            //     await user[user_id].room.join(groupId);
            // }
            // 拿到接受用户所在子进程
            const pid = await this.redis.getUserPid({ key: 'online_' + user_id });
            if (pid) {
                const data = {
                    user_id,
                    groupIds: [groupId],
                };
                app.messenger.sendTo(Number(pid), 'userJoinRooms', data);
            }
        }
    }

    /**
     * 撤回消息
     * */
    async withdrawMsg({ groupId = '', id = '', user_id = [], newsContentId = '' }) {
        const time = new Date().getTime();
        const { chatListModel, groupService } = this;
        await this.pushUserMsg({ user_id, sendType: 'withdrawMsg', expand: { id, groupId, time } });
        // 测回本条消息
        await chatListModel.update({ _id: id }, { withdrawType: 1, updateTime: time, content: '已撤回' });
        // 修改最新消息至聊天列表（群组）
        if (id === newsContentId) {
            await groupService.updGroup({
                id: groupId,
                updData: {
                    newsContentTime: time,
                    newsContent: '已撤回',
                },
            });
        }
    }

    /**
     * 撤回群聊消息
     * */
    async withdrawGroupMsg({ groupId = '', id = '', user_id = '', newsContentId = '' }) {
        const time = new Date().getTime();
        await this.pushGroupUserMsg({ groupId, sendType: 'withdrawGroupMsg', expand: { groupId, user_id, id, time } });
        // 测回本条消息
        await this.chatListModel.update({ _id: id }, { withdrawType: 1, updateTime: time, content: '已撤回' });
        // 修改最新消息至聊天列表（群组）
        if (id === newsContentId) {
            await this.groupService.updGroup({
                id: groupId,
                updData: {
                    newsContentTime: time,
                    newsContent: '已撤回',
                },
            });
        }
    }

    /**
     * 单聊已读消息
     * */
    async readUserMsg({ ids = [], user_form_id = '', user_id = '' }) {
        await this.pushUserMsg({ user_id: [user_form_id], sendType: 'readMsg', expand: { ids, user_id } });
        // 数据库里的消息设为已读
        const idArr = ids.map(res => {
            return res.id;
        });
        if (idArr.length > 0) {
            await this.chatListModel.updateMany({ _id: { $in: idArr } }, { readType: 1 });
        }
    }

    /**
     * 群聊已读消息
     * */
    async readGroupMsg({ ids = [], group_id = '', user_id = '' }) {
        await this.pushGroupUserMsg({ groupId: group_id, sendType: 'readGroupMsg', expand: { user_id, ids, group_id } });
        await this.chatListModel.updateMany(
            { _id: { $in: ids } },
            {
                $push: {
                    read_child_list: {
                        user_id,
                        createTime: new Date().getTime(),
                        updateTime: new Date().getTime(),
                    },
                },
            }
        );
    }

    /**
     * 已读消息
     * */
    // async readMsg({ groupId = '', id = '', user_id_arr = [], type = 0, user_id = '' }) {
    //     const { chatListModel } = this;
    //     await this.pushUserMsg({ user_id: user_id_arr, sendType: 'readMsg', expand: { id, groupId } });
    //     switch (type) {
    //         case 0: // 单聊
    //         case 2: // 客服
    //             // 数据库里的消息设为已读
    //             await chatListModel.updateOne({ _id: id }, { readType: 1, updateTime: new Date().getTime() });
    //             break;
    //         case 1: // 群聊
    //             await chatListModel.updateOne(
    //                 { _id: id },
    //                 {
    //                     $push: {
    //                         read_child_list: {
    //                             user_id,
    //                             createTime: new Date().getTime(),
    //                             updateTime: new Date().getTime(),
    //                         },
    //                     },
    //                 }
    //             );
    //             break;
    //     }
    // }

    /**
     * 通知人员 有群创建
     * */
    async groupCreateMsg({ groupId = '', user_id = '', user_child_id = [] }) {
        return await this.pushUserMsg({ user_id: user_child_id, expand: { groupId, user_id, user_child_id }, sendType: 'groupCreate' });
    }

    /**
     * 通知群成员 有新人加入
     * */
    async groupAddUserMsg({ user_id = [], expand = { groupId: '', user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupAddUser' });
    }

    /**
     * 通知群成员 有人删除
     * */
    async groupDelUserMsg({ user_id = [], expand = { groupId: '', user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupDelUser' });
    }

    /**
     * 通知群成员 有新管理员被设置
     * */
    async groupAddAdminMsg({ user_id = [], expand = { groupId: '', user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupAddAdmin' });
    }

    /**
     * 通知群成员 有管理员被删除
     * */
    async groupDelAdminMsg({ user_id = [], expand = { groupId: '', user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupDelAdmin' });
    }

    /**
     * 通知人员 设置公告
     * */
    async groupSetRemarkMsg({ user_id = [], expand = { groupId: '', remarkId: '', remark: '', time: new Date().getTime() } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupSetRemark' });
    }

    /**
     * 通知人员 已读公告
     * */
    async groupReadRemarkMsg({ user_id = [], expand = { groupId: '', remarkId: '', time: new Date().getTime(), user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupReadRemark' });
    }

    /**
     * 通知人员 有好友申请
     * */
    async mailApplyAddMsg({ user_id = [], expand = { remark: '', user_id: '', time: new Date().getTime(), id: '' } }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailApplyAdd' });
    }

    /**
     * 通知人员 有好友同意申请
     * */
    async mailAgreeAddMsg({ user_id = [], expand = { user_id: '', time: new Date().getTime() } }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailAgreeApplyAdd' });
    }

    /**
     * 通知人员 有好友拒绝申请
     * */
    async mailRefuseAddMsg({ user_id = [], expand = { user_id: '', time: new Date().getTime() } }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailRefuseApplyAdd' });
    }

    /**
     * 通知人员 有好友拉黑操作
     * */
    async mailBlackAddMsg({ user_id = [], expand = { user_id: '', time: new Date().getTime(), groupId: '' } }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailBlackAdd' });
    }

    /**
     * 通知人员 有好友取消拉黑操作
     * */
    async mailBlackDelMsg({ user_id = [], expand = { user_id: '', time: new Date().getTime(), groupId: '' } }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailBlackDel' });
    }

    /**
     * 通知人员 有群被禁言
     * */
    async groupAddEstoppelMsg({ user_id = [], expand = { groupId: '', time: new Date().getTime(), user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupAddEstoppel' });
    }

    /**
     * 通知人员 有群解除禁言
     * */
    async groupDelEstoppelMsg({ user_id = [], expand = { groupId: '', time: new Date().getTime(), user_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupDelEstoppel' });
    }

    /**
     * 通知人员 有群成员被禁言
     * */
    async groupAddUserEstoppelMsg({ user_id = [], expand = { groupId: '', time: new Date().getTime(), user_id: '', user_from_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupAddUserEstoppel' });
    }

    /**
     * 通知人员 有群成员被取消禁言
     * */
    async groupDelUserEstoppelMsg({ user_id = [], expand = { groupId: '', time: new Date().getTime(), user_id: '', user_from_id: '' } }) {
        return await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupDelUserEstoppel' });
    }

    /**
     * 通知人员 有群被解散
     * */
    async groupDelMsg({ expand = { groupId: '', time: new Date().getTime(), user_id: '' }, user_child_id = [] }) {
        await this.pushGroupUserMsg({ groupId: expand.groupId, expand, sendType: 'groupDel' });
        //  将当前在房间的人员清理
        // for (const i in user_child_id) {
        //     const user_id = user_child_id[i];
        //     // @ts-ignore
        //     if (this.app.ws.user[user_id]) {
        //         // @ts-ignore
        //         await this.app.ws.user[user_id].room.leave(expand.groupId);
        //     }
        // }
    }

    /**
     * 通知人员 好友删除关系
     * */
    async mailDelMsg({ expand = { time: new Date().getTime(), groupId: '', user_id: '' }, user_id = [] }) {
        return await this.pushUserMsg({ user_id, expand, sendType: 'mailDel' });
    }

    /**
     * 通知成员事件
     * */
    async pushUserMsg({
        user_id = [],
        sendType = '',
        expand = {},
    }: {
        user_id: string[];
        sendType: string;
        expand: {
            [key: string]: any;
        };
    }): Promise<void> {
        const { app } = this;
        if (expand.user_id) {
            const userData = await this.userService.findUserDataRequest({ user_id: expand.user_id });
            expand = { ...expand, userData };
        } else {
            delete expand.user_id;
        }
        if (expand.user_from_id) {
            const userFormData = await this.userService.findUserDataRequest({ user_id: expand.user_from_id });
            expand = { ...expand, userFormData };
        } else {
            delete expand.user_from_id;
        }
        if (!expand.time) {
            expand.time = new Date().getTime();
        }
        // @ts-ignore
        const user = app?.ws?.user ?? {};
        for (const i in user_id) {
            // if (user[user_id[i]]) {
            //     const data = { ...expand };
            //     await user[user_id[i]].send(
            //         JSON.stringify({
            //             code: 1,
            //             data,
            //             sendType,
            //         })
            //     );
            // }
            const toId = user_id[i];
            const pid = await this.redis.getUserPid({ key: 'online_' + toId });
            if (pid) {
                const data = {
                    sendType,
                    data: { ...expand },
                    code: 1,
                };
                app.messenger.sendTo(Number(pid), 'send', { data, user_id: toId });
            }
        }
    }

    /**
     * 通知群成员事件
     * */
    async pushGroupUserMsg({
        groupId = '',
        sendType = '',
        expand = {},
    }: {
        groupId: string;
        sendType: string;
        expand: {
            [key: string]: any;
        };
    }): Promise<void> {
        const { app } = this;
        if (expand.user_id) {
            const userData = await this.userService.findUserDataRequest({ user_id: expand.user_id });
            expand = { ...expand, userData };
        } else {
            delete expand.user_id;
        }
        if (expand.user_from_id) {
            const userFormData = await this.userService.findUserDataRequest({ user_id: expand.user_from_id });
            expand = { ...expand, userFormData };
        } else {
            delete expand.user_from_id;
        }
        if (!expand.time) {
            expand.time = new Date().getTime();
        }
        const room = app.ws;
        await room.sendJsonTo(groupId, {
            code: 1,
            data: expand,
            sendType,
        });
    }
}
