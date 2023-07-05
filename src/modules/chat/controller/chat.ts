import { Inject, Controller, App, Post, Body, Get, Query, Headers } from '@midwayjs/decorator';
import { Validate } from '@midwayjs/validate';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';
import { SocketService } from '../service/socket';
import { sendSingleDTO, getOffLineMsgListDTO, withdrawMsgDTO, readMsgDTO } from '../dto/chat';
import { RedisFunService } from '../../../common/service/redis';
import { ReturnModelType } from '@typegoose/typegoose';
import { InjectEntityModel as typegooseInjectEntityModel } from '@midwayjs/typegoose';
import { chat_group as oose_chat_group, chatList } from '../model/mongodb';
import { GroupService } from '../service/group';
import { userService } from '../../user/service/user';
import { headerDTO } from '../../../common/util/BaseDTO';
import { request } from '../../../common/util/request/apiRequest';
import config from '../../../config/config';
const requestApi = new request();
// import qs = require('qs');
// import * as QRCode from 'qrcode';
// import * as qr from 'qr-image';
// import { resolve } from 'path';

@Controller('/api/chat')
export class ChatController {
    @Inject() ctx: Context;

    @Inject() Common: Api;

    @App() app: Application;

    @Inject() socketService: SocketService;

    @Inject() redis: RedisFunService;

    @typegooseInjectEntityModel(oose_chat_group) groupModel: ReturnModelType<typeof oose_chat_group>;

    @typegooseInjectEntityModel(chatList) chatListModel: ReturnModelType<typeof chatList>;

    @Inject() groupService: GroupService;

    @Inject() requestService: userService;

    // 连接socket
    async connect(@Query() params: { [key: string]: string }) {
        const user_id = params.id;
        // @ts-ignore
        const { app, websocket } = this;
        // @ts-ignore
        const user = app.ws.user ?? {};
        if (!user_id) {
            const msg = JSON.stringify({
                msg: 'ws连接失败，id不能为空',
                data: '',
                code: -1,
            });
            websocket.send(msg);
            websocket.close();
        }
        // if (user[user_id]) {
        //     user[user_id].send(
        //         JSON.stringify({
        //             msg: '你的账号在其他设备登录',
        //             data: '',
        //             code: -1,
        //         })
        //     );
        //     user[user_id].close();
        // }
        // @ts-ignore
        const opid = await this.app.ioredis.get('online_' + user_id);
        if (opid && String(opid) !== String(process.pid)) {
            // 通知对应进程用户下线   app.messenger.sendTo是egg进程间的通讯 发送给指定进程
            app.messenger.sendTo(Number(opid), 'offline', user_id);
        }
        websocket.userId = user_id;
        user[user_id] = websocket;
        // @ts-ignore
        app.ws.user = user;
        const msg = JSON.stringify({
            msg: 'ws连接成功',
            data: '',
            code: 0,
        });
        websocket.send(msg);
        websocket
            .on('message', msg => {
                console.log('接收消息', msg, process.pid);
            })
            .on('close', (code, reason) => {
                console.log('用户下线', code, reason, process.pid);
            });
        // @ts-ignore
        console.log(`clients: ${app.ws.clients.size}`);
        const pid = process.pid;
        // @ts-ignore
        await this.app.ioredis.set('online_' + user_id, pid);
        // 将当前连接加入所属房间
        requestApi.post({
            url: `http://127.0.0.1:${config.post}/api/chat/userJoinRooms`,
            params: { user_id },
        });
    }

    /**
     * 将当前连接加入所属房间
     * */
    @Post('/userJoinRooms')
    async userJoinRooms(@Body() params) {
        const user_id = params.user_id;
        await this.socketService.userJoinRooms({ user_id });
        return this.Common.success({ msg: '操作成功' });
    }

    /**
     * 发送消息
     * */
    @Post('/sendMsg')
    @Validate()
    async sendSingle(@Body() params: sendSingleDTO, @Headers() header: headerDTO) {
        const postData: any = {
            groupId: params.groupId,
            msgType: params.msgType,
            // type: params.type,
            content: params.content,
            sendUserId: header.user_id,
            // sendName: params.sendName,
            // ascriptionId: '',
            // id: await this.Common.getSnowflakeId(),
            readType: 0,
            withdrawType: 0,
            id: '',
        };
        const groupData = await this.groupModel.findById(postData.groupId).select(['black_id', 'status', 'user_child_id', 'type', 'admin_user_id', 'user_id']);
        if (!groupData) {
            return this.Common.error({ msg: '暂无好友或群组信息' });
        }
        const messageData = {
            createTime: new Date().getTime(),
            updateTime: new Date().getTime(),
            sendUserId: postData.sendUserId,
            groupId: postData.groupId,
            msgType: postData.msgType,
            content: postData.content,
            readType: 0,
            withdrawType: 0,
            status: 0,
            read_child_list: [],
            id: '',
        };
        switch (groupData.type) {
            case 0: // 单聊
            case 2: {
                // 客服
                let message: chatList = null;
                // eslint-disable-next-line no-case-declarations
                const index = groupData.user_child_id.findIndex(res => {
                    return String(res) === String(messageData.sendUserId);
                });
                if (groupData.user_child_id.length <= 1 || index === -1) {
                    return this.Common.error({ msg: '无好友关系' });
                }
                if (groupData.status === 1) {
                    return this.Common.error({ msg: '好友不存在或禁用' });
                } else if (groupData.status === 2) {
                    return this.Common.error({
                        data: '已拉黑',
                        msg: groupData.black_id.includes(String(messageData.sendUserId)) ? '对方已将你拉黑' : '您已将对方拉黑',
                    });
                }
                groupData.user_child_id.splice(index, 1);
                message = await this.socketService.setMsg({ message: messageData });
                // message = await this.socketService.send(groupData.user_child_id[0], messageData);
                Object.keys(messageData).forEach(key => {
                    messageData[key] = message[key] ?? messageData[key];
                });
                this.ctx.body = this.Common.success({
                    data: messageData,
                    msg: '发送成功',
                });
                await this.socketService.send({ toId: groupData.user_child_id[0], message: messageData });
                break;
            }
            case 1: {
                // 群聊
                let message: chatList = null;
                if (!groupData.user_child_id.includes(messageData.sendUserId)) {
                    return this.Common.error({ msg: '您不是本群人员，不可发送消息' });
                }
                if (groupData.status === 1) {
                    return this.Common.error({ msg: '群组不存在或禁用' });
                }
                if (groupData.status === 3 && !groupData.admin_user_id.includes(messageData.sendUserId) && groupData.user_id !== messageData.sendUserId) {
                    return this.Common.error({ msg: '群组已被禁言，不可发送消息' });
                }
                if (groupData.black_id.includes(header.user_id)) {
                    return this.Common.error({ msg: '您已被禁言' });
                }
                message = await this.socketService.setMsg({ message: messageData });
                Object.keys(messageData).forEach(key => {
                    messageData[key] = message[key] ?? messageData[key];
                });
                this.ctx.body = this.Common.success({
                    data: messageData,
                    msg: '发送成功',
                });
                await this.socketService.groupSend({ toIds: groupData.user_child_id, message: messageData });
                break;
            }
        }
    }
    /**
     * 获取离线消息
     * */
    @Get('/getOffLineMsgList')
    @Validate()
    async getOffLineMsgList(@Query() params: getOffLineMsgListDTO, @Headers() header: headerDTO) {
        const limit: number = params.limit || 10;
        const page: number = params.page || 1;
        const num: number = Number(page) * limit - limit;
        const groupData: any = await this.groupService.getGroupUser({ id: params.groupId, user_id: header.user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        const data: any[] = await this.chatListModel.find({ groupId: params.groupId }).limit(limit).skip(num).sort({ createTime: 'desc' }).select('-oldContent');
        if (data && data.length > 0) {
            for (const i in data) {
                const obj = data[i]._doc;
                if (obj.read_child_list && obj.read_child_list.length > 0) {
                    for (const a in obj.read_child_list) {
                        const res: any = obj.read_child_list[a]._doc;
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
        const count: number = await this.chatListModel.find({ groupId: params.groupId }).count();
        return this.Common.pageSuccess({ data, limit, page, count });
    }

    /**
     * 撤回消息
     * */
    @Get('/withdrawMsg')
    @Validate()
    async withdrawMsg(@Query() params: withdrawMsgDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const msgData = await this.chatListModel.findOne({ withdrawType: 0, sendUserId: user_id, _id: id }).exec();
        if (!msgData) {
            return this.Common.error({ msg: '暂无未撤回信息' });
        }
        if (String(msgData.sendUserId) !== String(user_id)) {
            return this.Common.error({ msg: '您不是消息发送人，不可撤回' });
        }
        // 当前时间戳大于2分钟
        if (new Date().getTime() - Number(msgData.createTime) > 120000) {
            return this.Common.error({ msg: '撤回失败,已超时' });
        }
        const groupId = msgData.groupId;
        const rows = await this.groupModel.findById(groupId);
        switch (rows.type) {
            case 0:
            case 2:
                await this.socketService.withdrawMsg({
                    groupId,
                    id,
                    user_id: rows.user_child_id,
                    newsContentId: rows.newsContentId,
                });
                break;
            case 1:
                await this.socketService.withdrawGroupMsg({ groupId, id, user_id, newsContentId: rows.newsContentId });
                break;
        }

        return this.Common.success({ msg: '已撤回' });
    }

    /**
     * 已读消息
     * */
    @Post('/readMsg')
    @Validate()
    async readMsg(@Body() params: readMsgDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { ids } = params;
        const msgDataList = await this.chatListModel.find({ status: 0, _id: { $in: ids.split(',') }, readType: 0 }).exec();
        if (!msgDataList && msgDataList.length === 0) {
            return this.Common.error({ msg: '暂无未读信息' });
        }
        // 单聊消息ids
        const idArr = [];
        // 群聊消息ids
        const groupMsgIdArr = [];
        for (const i in msgDataList) {
            const msgData = msgDataList[i];
            const groupId = msgData.groupId;
            // const rows = await this.groupModel.findById(groupId);
            const rows: any = await this.groupService.getGroupUser({ id: groupId, user_id });
            if (!rows) {
                // 暂无群组消息
                break;
            }
            // 单聊 客服
            if ([0, 2].includes(rows.type)) {
                if (String(msgData.sendUserId) === String(user_id)) {
                    // return this.Common.error({ msg: '暂无未读信息' });
                    break;
                }
                const user_form_id = rows.user_child_id.filter(res => {
                    return res !== user_id;
                });
                if (!user_form_id || user_form_id.length !== 1) {
                    break;
                }
                const index = idArr.findIndex(res => {
                    return res.user_form_id === user_form_id[0];
                });
                if (index === -1) {
                    idArr.push({ ids: [{ id: msgData.id, groupId }], user_form_id: user_form_id[0] });
                } else {
                    idArr[index].ids.push({ id: msgData.id, groupId });
                }
            } else if ([1].includes(rows.type)) {
                // 群聊
                const index = msgData.read_child_list.findIndex(res => {
                    return String(res.user_id) === String(user_id);
                });
                if (index !== -1) {
                    // return this.Common.error({ msg: '暂无未读信息' });
                    break;
                }
                const msgIndex = groupMsgIdArr.findIndex(res => {
                    return res.groupId === groupId;
                });
                if (msgIndex === -1) {
                    groupMsgIdArr.push({ ids: [msgData.id], groupId });
                } else {
                    groupMsgIdArr[msgIndex].ids.push(msgData.id);
                }
            }
        }
        if (idArr.length > 0) {
            for (const i in idArr) {
                await this.socketService.readUserMsg({ ids: idArr[i].ids, user_form_id: idArr[i].user_form_id, user_id });
            }
            // await this.socketService.readMsg({
            //     groupId,
            //     id,
            //     user_id_arr: rows.user_child_id,
            //     type: rows.type,
            //     user_id,
            // });
        }

        if (groupMsgIdArr.length > 0) {
            for (const i in groupMsgIdArr) {
                await this.socketService.readGroupMsg({ ids: groupMsgIdArr[i].ids, user_id, group_id: groupMsgIdArr[i].groupId });
            }
        }

        return this.Common.success({ msg: '已读成功' });
    }

    /**
    测试接口
    */
    @Post('/test')
    async test() {
        // create data
        // const id: string = await this.Common.getSnowflakeId();
        // await this.userModel.create({ ascriptionId: 'ascriptionId', sendUserId: 'sendUserId' } as chatList); // an
        // "as" assertion, to have types for all properties
        // const user = await this.userModel.find({});
        // const user = await this.userModel.aggregate([{ $project: { id: '$_id' } }]);
        // .where({ id: '63b189d5f4ab1bb57c98d015' })
        // .limit(1);
        // find data
        // const user = await this.userModel.findById(id).exec();
        // console.log(user);
        // const getQRCode = async () => {
        //     return new Promise((resolve, reject) => {
        //         QRCode.toString('I am a pony!I am a pony!I am a pony!I am a pony!', { type: 'svg' }, (err, url) => {
        //             // console.log(url);
        //             resolve('data:image/png;base64,' + Buffer.from(url).toString('base64'));
        //         });
        //     });
        // };
        // const data = await getQRCode();
        // const newUtil: string = resolve('./upload/static/20221221/icon-76dasds.png');
        // const data = qr.imageSync('我是恁爹', { type: 'png' });
        // const base64 = 'data:image/png;base64,' + Buffer.from(data).toString('base64');
        return this.Common.success({ data: 'dsd' });
    }
}
