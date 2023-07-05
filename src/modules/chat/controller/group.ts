import { Inject, Controller, App, Query, Get, Logger, Body, Post, Headers } from '@midwayjs/decorator';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';
import { Validate } from '@midwayjs/validate';
import {
    getFirstGroupIdDTO,
    createGroupDTO,
    updGroupDTO,
    groupAddUserDTO,
    updGroupRemarkDTO,
    remarkReadDTO,
    remarkListDTO,
    gatGroupListDTO,
    gatGroupDataDTO,
    remarkDataDTO,
    groupSetEstoppelDTO,
    groupSetUserEstoppelDTO,
    shareGroupDTO,
    shareGroupAddUserDTO,
} from '../dto/chat';
import { ILogger } from '@midwayjs/logger';
import { GroupService } from '../service/group';
import { SocketService } from '../service/socket';
import { headerDTO } from '../../../common/util/BaseDTO';

// 群组信息筛选字段
const groupDataSelect = [
    '-user_child_id',
    // 'newsContentTime', 'newsContent', 'name', 'avatar', 'user_id', 'admin_user_id', 'user_child_list', 'remark', 'type', 'status', 'createTime'
];
@Controller('/api/group')
export class GroupController {
    @Logger('apiRequestLogger') apiRequestLogger: ILogger;
    @Logger() logger: ILogger;

    @Inject() ctx: Context;

    @Inject() Common: Api;

    @App() app: Application;

    @Inject() groupService: GroupService;

    @Inject() socketService: SocketService;

    // 首次单聊获取群组id
    @Get('/getFirstGroupId')
    @Validate()
    async getFirstGroupId(@Query() params: getFirstGroupIdDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { ascriptionId } = params;
        if (user_id === ascriptionId) {
            return this.Common.error({ msg: '不可与自己聊天' });
        }
        try {
            const groupData: any = await this.groupService.getFirstGroupId({ ascriptionId, sendUserId: user_id });
            return this.Common.success({ data: groupData.data });
        } catch (e) {
            return this.Common.error({ data: e.data, msg: e.msg });
        }
    }

    /**
     * 获取聊天群组详情
     * */
    @Get('/getGroupData')
    @Validate()
    async getGroupData(@Query() params: gatGroupDataDTO, @Headers() header: headerDTO) {
        const groupData: any = await this.groupService.getGroupUser({ id: params.id, user_id: header.user_id, select: groupDataSelect });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        return this.Common.success({ data: groupData, expand: { header } });
    }

    /**
     * 获取聊天群组列表
     * */
    @Get('/gatGroupList')
    @Validate()
    async gatGroupList(@Query() params: gatGroupListDTO, @Headers() header: headerDTO) {
        const postData = { user_child_id: { $in: [header.user_id] }, status: { $in: [0, 2, 3] } };
        const array: any[] = await this.groupService.getLikeGroup(postData, 'all', groupDataSelect);
        const data: any[] = [];
        let newCounts = 0;
        for (const i in array) {
            const res = { ...array[i]._doc, newCount: 0 };
            res.id = res._id;
            delete res._id;
            delete res.__v;
            // 单聊 或 客服
            if ([0, 2].includes(res.type)) {
                try {
                    res.newCount = await this.groupService.getGroupUnreadCount(res.id);
                } catch (e) {}
                try {
                    const userArr = res.user_child_list.filter(res => {
                        return String(res.user_id) !== String(header.user_id);
                    });
                    res.name = userArr[0].nick_name;
                } catch (e) {}
            } else if (res.type === 1) {
                // 群聊
                try {
                    res.newCount = await this.groupService.getGroupChatUnreadCount({ groupId: res.id, userId: header.user_id });
                } catch (e) {}
            }
            newCounts += res.newCount;
            data.push(res);
        }
        return this.Common.success({ data, expand: { newCounts } });
    }

    //创建群组
    @Post('/createGroup')
    @Validate()
    async createGroup(@Body() params: createGroupDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const postData = {
            name: params.name,
            avatar: params.avatar || '',
            user_id,
            type: 1,
            user_child_id: params.user_child_id.split(','),
            user_child_list: [],
        };
        if (!postData.user_child_id.includes(user_id)) {
            postData.user_child_id.push(user_id);
        }
        if (postData.user_child_id.length <= 1) {
            return this.Common.error({ msg: '群组人员不能小于3名' });
        }
        postData.user_child_id.forEach(res => {
            postData.user_child_list.push({
                user_id: res,
                createTime: new Date().getTime(),
                updateTime: new Date().getTime(),
            });
        });
        // if ([0, 2].includes(postData.type)) {
        //     if (postData.user_child_id.length > 2) {
        //         return this.Common.error({ msg: '单聊或客服 群成员不能大于2个' });
        //     }
        //     const groupData = await this.groupService.getLikeGroup({ user_child_id: { $in: postData.user_child_id }, type: postData.type });
        //     if (groupData) {
        //         return this.Common.success({ data: groupData });
        //     }
        // }
        const groupData: any = await this.groupService.createGroup(postData);
        this.ctx.body = this.Common.success({ data: groupData });
        // 通知人
        await this.socketService.groupCreateMsg({ groupId: groupData.id, user_id, user_child_id: groupData.user_child_id });
        // 将群组人员拉入本群房间
        await this.socketService.userJoinToRoom({ user_id_arr: groupData.user_child_id, groupId: groupData.id });
    }

    /**
     * 修改群组信息
     * */
    @Post('/updGroup')
    @Validate()
    async updGroup(@Body() params: updGroupDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id) && !groupData.admin_user_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您不是群主或群管理员，不可修改群信息' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '非群聊不可修改信息' });
        }
        const updData: any = {};
        if (params.name) {
            updData.name = params.name;
        }
        if (params.avatar) {
            updData.avatar = params.avatar;
        }
        if (Object.keys(updData).length === 0) {
            return this.Common.error({ msg: '请传入要修改的数据' });
        }
        await this.groupService.updGroup({ id, updData });
        const updGroupData = await this.groupService.getGroup({ id, select: groupDataSelect });
        return this.Common.success({ data: updGroupData });
    }

    /**
     * 添加群成员
     * */
    @Post('/groupAddUser')
    @Validate()
    async groupAddUser(@Body() params: groupAddUserDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_child_id } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id) && !groupData.admin_user_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您不是群主或群管理员，不可继续操作' });
        }
        if (groupData.user_child_id.includes(String(user_child_id))) {
            return this.Common.error({ msg: '群成员已存在' });
        }
        await this.groupService.group_add_user({ groupId: groupData.id, user_id: user_child_id, user_child_id: groupData.user_child_id });
        // groupData.user_child_id.push(user_child_id);
        // const updData = {
        //     user_child_id: groupData.user_child_id,
        //     $push: {
        //         user_child_list: {
        //             user_id: user_child_id,
        //             createTime: new Date().getTime(),
        //             updateTime: new Date().getTime(),
        //         },
        //     },
        // };
        // await this.groupService.updGroup({ id, updData });
        this.ctx.body = this.Common.success({ msg: '添加成功' });
        await this.socketService.userJoinToRoom({ user_id_arr: [user_child_id], groupId: id });
    }

    /**
     * 删除群成员
     * */
    @Post('/groupDelUser')
    @Validate()
    async groupDelUser(@Body() params: groupAddUserDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_child_id } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id) && !groupData.admin_user_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您不是群主或群管理员，不可继续操作' });
        }
        const index = groupData.user_child_id.findIndex(res => {
            return res === String(user_child_id);
        });
        if (index === -1) {
            return this.Common.error({ msg: '群成员不存在' });
        }

        if (String(user_child_id) === groupData.user_id) {
            return this.Common.error({ msg: '不可删除群主' });
        }

        groupData.user_child_id.splice(index, 1);
        const updData = {
            user_child_id: groupData.user_child_id,
            $pull: {
                user_child_list: {
                    user_id: String(user_child_id),
                },
            },
        };
        await this.groupService.updGroup({ id, updData });
        this.ctx.body = this.Common.success({ msg: '删除成功' });
        // 通知人员
        await this.socketService.groupDelUserMsg({ expand: { groupId: groupData.id, user_id: user_child_id }, user_id: groupData.user_child_id });
    }

    /**
     * 设置群管理员
     * */
    @Post('/groupSetAdmins')
    @Validate()
    async groupSetAdmins(@Body() params: groupAddUserDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_child_id } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id)) {
            return this.Common.error({ msg: '您不是群主，不可继续操作' });
        }
        if (!groupData.user_child_id.includes(user_child_id)) {
            return this.Common.error({ msg: '要添加的成员不属于本群组' });
        }
        if (groupData.admin_user_id.includes(String(user_child_id))) {
            return this.Common.error({ msg: '群管理员已存在' });
        }
        if (String(groupData.user_id) === String(user_child_id)) {
            return this.Common.error({ msg: '群主不可成为群管理员' });
        }
        groupData.admin_user_id.push(user_child_id);
        const updData = {
            admin_user_id: groupData.admin_user_id,
        };
        await this.groupService.updGroup({ id, updData });
        this.ctx.body = this.Common.success({ msg: '添加成功' });
        // 通知人员
        await this.socketService.groupAddAdminMsg({ expand: { groupId: groupData.id, user_id: user_child_id }, user_id: groupData.user_child_id });
    }

    /**
     * 删除群管理员
     * */
    @Post('/groupDelAdmins')
    @Validate()
    async groupDelAdmins(@Body() params: groupAddUserDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_child_id } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id)) {
            return this.Common.error({ msg: '您不是群主，不可继续操作' });
        }
        const index = groupData.admin_user_id.findIndex(res => {
            return res === String(user_child_id);
        });
        if (index === -1) {
            return this.Common.error({ msg: '群管理员不存在' });
        }
        groupData.admin_user_id.splice(index, 1);
        const updData = {
            admin_user_id: groupData.admin_user_id,
        };
        await this.groupService.updGroup({ id, updData });
        this.ctx.body = this.Common.success({ msg: '删除成功' });
        // 通知人员
        await this.socketService.groupDelAdminMsg({ expand: { groupId: groupData.id, user_id: user_child_id }, user_id: groupData.user_child_id });
    }

    /**
     * 设置群公告
     * */
    @Post('/groupSetRemark')
    @Validate()
    async groupSetRemark(@Body() params: updGroupRemarkDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, remark, type } = params;
        const groupData: any = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息或不是本群人员' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (String(user_id) !== String(groupData.user_id) && !groupData.admin_user_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您不是群主或群管理员，不可添加q群信息' });
        }
        const updData = {
            remark,
        };
        const remarkData: any = await this.groupService.setRemarks({ groupId: id, remark, user_id });
        await this.groupService.updGroup({ id, updData });
        // const updGroupData = await this.groupService.getGroup({ id });
        this.ctx.body = this.Common.success({ msg: '设置成功', data: remarkData });
        if (!type || [0, '0'].includes(type)) {
            // 通知人员
            const expand = { groupId: groupData.id, remarkId: remarkData.id, remark, time: new Date().getTime() };
            await this.socketService.groupSetRemarkMsg({ expand, user_id: groupData.user_child_id });
        }
    }

    /**
     * 群公告已读
     * */
    @Post('/remarkRead')
    @Validate()
    async remarkRead(@Body() params: remarkReadDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const remarkData = await this.groupService.getRemark({ id });
        if (!remarkData) {
            return this.Common.error({ msg: '暂无群公告详情' });
        }
        const groupData = await this.groupService.getGroupUser({ id: remarkData.groupId, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        const index = remarkData.user_child_list.findIndex(res => {
            return res.user_id === String(user_id);
        });
        if (index !== -1) {
            return this.Common.error({ msg: '本条公告已读' });
        }
        await this.groupService.addRemarkReadUser({ id, user_id });
        const remarkUpdData = await this.groupService.getRemark({ id });
        this.ctx.body = this.Common.success({ data: remarkUpdData });
        // 通知人员
        const expand = { groupId: remarkData.groupId, remarkId: remarkData.id, time: new Date().getTime(), user_id };
        await this.socketService.groupReadRemarkMsg({ expand, user_id: [remarkData.user_id] });
    }

    /**
     * 获取群公告列表
     * */
    @Get('/getRemarks')
    @Validate()
    async getRemarks(@Query() params: remarkListDTO, @Headers() header: headerDTO) {
        const limit: number = params.limit || 10;
        const page: number = params.page || 1;
        const groupData = await this.groupService.getGroupUser({ id: params.id, user_id: header.user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        const data = await this.groupService.getRemarkList({ groupId: params.id, limit, page });
        return this.Common.pageSuccess({ data: data.data, limit, page, count: data.count });
    }

    /**
     * 获取群公告详情
     * */
    @Get('/getRemarkData')
    @Validate()
    async getRemarkData(@Query() params: remarkDataDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const remarkData = await this.groupService.getRemark({ id });
        if (!remarkData) {
            return this.Common.error({ msg: '暂无公告详情' });
        }
        const groupData = await this.groupService.getGroupUser({ id: remarkData.groupId, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        return this.Common.success({ data: remarkData });
    }

    /**
     * 设置群禁言
     * */
    @Post('/groupSetEstoppel')
    @Validate()
    async groupSetEstoppel(@Body() params: groupSetEstoppelDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const groupId = params.id;
        const groupData = await this.groupService.getGroupUser({ id: groupId, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_id !== user_id && !groupData.admin_user_id.includes(user_id)) {
            return this.Common.error({ msg: '您不是群主或管理员' });
        }
        await this.groupService.updGroup({ id: groupData.id, updData: { status: 3 } });
        this.ctx.body = this.Common.success({ msg: '设置成功' });
        // 通知人员
        const expand = { groupId, time: new Date().getTime(), user_id };
        await this.socketService.groupAddEstoppelMsg({ expand, user_id: groupData.user_child_id });
    }

    /**
     * 取消群禁言
     * */
    @Post('/groupDelEstoppel')
    @Validate()
    async groupDelEstoppel(@Body() params: groupSetEstoppelDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const groupId = params.id;
        const groupData = await this.groupService.getGroupUser({ id: groupId, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_id !== user_id && !groupData.admin_user_id.includes(user_id)) {
            return this.Common.error({ msg: '您不是群主或管理员' });
        }
        await this.groupService.updGroup({ id: groupData.id, updData: { status: 0 } });
        this.ctx.body = this.Common.success({ msg: '设置成功' });
        // 通知人员
        const expand = { groupId, time: new Date().getTime(), user_id };
        await this.socketService.groupDelEstoppelMsg({ expand, user_id: groupData.user_child_id });
    }

    /**
     * 设置群成员禁言
     * */
    @Post('/groupSetUserEstoppel')
    @Validate()
    async groupSetUserEstoppel(@Body() params: groupSetUserEstoppelDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_from_id } = params;
        const groupData = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_id !== user_id && !groupData.admin_user_id.includes(user_id)) {
            return this.Common.error({ msg: '您不是群主或管理员' });
        }
        if (String(user_from_id) === user_id) {
            return this.Common.error({ msg: '不可禁言自己' });
        }
        if (String(user_from_id) === String(groupData.user_id)) {
            return this.Common.error({ msg: '不可禁言群主' });
        }
        if (!groupData.user_child_id.includes(String(user_from_id))) {
            return this.Common.error({ msg: '禁言人员不属于该群组' });
        }
        if (groupData.user_id !== user_id && groupData.admin_user_id.includes(user_from_id)) {
            return this.Common.error({ msg: '您不是群主，不可禁言管理员' });
        }
        const black_id = groupData.black_id;
        const index = black_id.findIndex(res => {
            return String(res) === user_from_id;
        });
        if (index !== -1) {
            return this.Common.error({ msg: '该成员已被禁言' });
        }
        black_id.push(user_from_id);
        await this.groupService.updGroup({ id: groupData.id, updData: { black_id } });
        this.ctx.body = this.Common.success({ msg: '添加成功' });
        // 通知人员
        const expand = { groupId: groupData.id, time: new Date().getTime(), user_id, user_from_id };
        await this.socketService.groupAddUserEstoppelMsg({ expand, user_id: groupData.user_child_id });
    }

    /**
     * 取消群成员禁言
     * */
    @Post('/groupDelUserEstoppel')
    @Validate()
    async groupDelUserEstoppel(@Body() params: groupSetUserEstoppelDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id, user_from_id } = params;
        const groupData = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_id !== user_id && !groupData.admin_user_id.includes(user_id)) {
            return this.Common.error({ msg: '您不是群主或管理员' });
        }
        if (String(user_from_id) === user_id) {
            return this.Common.error({ msg: '不可取消禁言自己' });
        }
        if (String(user_from_id) === String(groupData.user_id)) {
            return this.Common.error({ msg: '不可操作群主' });
        }
        if (!groupData.user_child_id.includes(String(user_from_id))) {
            return this.Common.error({ msg: '取消禁言人员不属于该群组' });
        }
        if (groupData.user_id !== user_id && groupData.admin_user_id.includes(user_from_id)) {
            return this.Common.error({ msg: '您不是群主，不可取消禁言管理员' });
        }
        const black_id = groupData.black_id;
        const index = black_id.findIndex(res => {
            return String(res) === user_from_id;
        });
        if (index === -1) {
            return this.Common.error({ msg: '该成员未被禁言' });
        }
        black_id.splice(index, 1);
        await this.groupService.updGroup({ id: groupData.id, updData: { black_id } });
        this.ctx.body = this.Common.success({ msg: '取消成功' });
        // 通知人员
        const expand = { groupId: groupData.id, time: new Date().getTime(), user_id, user_from_id };
        await this.socketService.groupDelUserEstoppelMsg({ expand, user_id: groupData.user_child_id });
    }

    /**
     * 分享群 邀请人员加入
     * */
    @Post('/shareGroup')
    @Validate()
    async shareGroup(@Body() params: shareGroupDTO, @Headers() header: headerDTO) {
        const { id, remark } = params;
        let overtime = params.overtime;
        const { user_id } = header;
        if (!overtime && overtime !== 0) {
            overtime = 7200000;
        }
        const groupData = await this.groupService.getGroupUser({ id, user_id });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_id !== user_id && !groupData.admin_user_id.includes(user_id)) {
            return this.Common.error({ msg: '您不是群主或管理员' });
        }
        const data = await this.groupService.group_share_add({ groupId: id, remark, overtime, user_id });
        return this.Common.success({ data });
    }

    /**
     * 扫码进群
     * */
    @Post('/shareGroupAddUser', { description: '扫码进群' })
    @Validate()
    async shareGroupAddUser(@Body() params: shareGroupAddUserDTO, @Headers() header: headerDTO) {
        const { id } = params;
        const { user_id } = header;
        const shareData = await this.groupService.get_group_share({ id });
        if (!shareData) {
            return this.Common.error({ msg: '暂无分享数据' });
        }
        const time: number = new Date().getTime();
        if (shareData.overtime && time - Number(shareData.createTime) > Number(shareData.overtime)) {
            return this.Common.error({ msg: '邀请已失效' });
        }
        const groupData = await this.groupService.getGroup({ id: shareData.groupId });
        if (!groupData) {
            return this.Common.error({ msg: '暂无群组信息' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        if (groupData.user_child_id.includes(user_id)) {
            return this.Common.error({ msg: '您已在群组里，不可重复加入' });
        }
        await this.groupService.group_add_user({ groupId: groupData.id, user_id, user_child_id: groupData.user_child_id });
        this.ctx.body = this.Common.success({ msg: '加入成功' });
        await this.socketService.userJoinToRoom({ user_id_arr: [user_id], groupId: groupData.id });
    }

    /**
     * 解散群组
     * */
    @Post('/delGroup')
    @Validate()
    async delGroup(@Body() params: shareGroupAddUserDTO, @Headers() header: headerDTO) {
        const { id } = params;
        const { user_id } = header;
        const groupData = await this.groupService.getGroupUser({ id, user_id, select: ['user_id', 'type', 'status', 'user_child_id'] });
        if (!groupData) {
            return this.Common.error({ msg: '您非本群组人员，不可获取' });
        }
        if (groupData.status === 1) {
            return this.Common.error({ msg: '群已被禁用，不可操作' });
        }
        if (groupData.user_id !== user_id) {
            return this.Common.error({ msg: '您不是群主' });
        }
        if (groupData.type !== 1) {
            return this.Common.error({ msg: '只有群聊才可设置' });
        }
        await this.groupService.group_del({ groupId: id });
        this.ctx.body = this.Common.success({ msg: '解散成功' });
        await this.socketService.groupDelMsg({ expand: { user_id, groupId: id, time: new Date().getTime() }, user_child_id: groupData.user_child_id });
    }
}
