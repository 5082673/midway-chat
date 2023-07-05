import { Inject, Controller, App, Post, Body, Query, Get, Headers } from '@midwayjs/decorator';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';
import { Validate } from '@midwayjs/validate';
import { addBlackMailDTO, agreeApplyDTO, getApplyDTO, groupSetEstoppelDTO, mailAddDTO } from '../dto/chat';
import { GroupService } from '../service/group';
import { InjectEntityModel as typegooseInjectEntityModel } from '@midwayjs/typegoose/dist/decorator/injectEntityModel';
import { mail_apply_list } from '../model/mongodb';
import { ReturnModelType } from '@typegoose/typegoose';
// import * as mongoose from 'mongoose';
import { SocketService } from '../service/socket';
import { headerDTO } from '../../../common/util/BaseDTO';

@Controller('/api/mail')
export class MailController {
    @Inject() ctx: Context;

    @Inject() Common: Api;

    @App() app: Application;

    @Inject() groupService: GroupService;

    @Inject() socketService: SocketService;

    @typegooseInjectEntityModel(mail_apply_list)
    mail_apply_list_model: ReturnModelType<typeof mail_apply_list>;

    /**
     * 发起好友申请
     * */
    @Post('/mailAdd')
    @Validate()
    async mailAdd(@Body() params: mailAddDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { user_from_id, remark } = params;
        const groupData = await this.groupService.getLikeGroup({
            user_child_id: { $all: [user_from_id, user_id], $size: 2 },
            type: 0,
        });
        let groupId = '';
        if (groupData) {
            if (groupData.status === 0) {
                return this.Common.error({ msg: '已建立好友关系，不可继续申请添加' });
            }
            if (groupData.status === 2) {
                return this.Common.error({
                    data: '已拉黑',
                    msg: groupData.black_id.includes(String(user_id)) ? '对方已将你拉黑' : '您已将对方拉黑',
                });
            }
            if (groupData.status === 1) {
                // return this.Common.error({ msg: '好友关系禁用' });
                groupId = groupData.id;
            }
            // return this.Common.error({ msg: '已建立好友关系，不可继续申请添加' });
        }

        const findData = await this.mail_apply_list_model.findOne({
            user_id,
            user_from_id,
        });

        if (findData) {
            findData.updateTime = new Date().getTime();
            findData.remark = remark;
            await this.mail_apply_list_model.updateOne(
                { _id: findData.id },
                {
                    updateTime: findData.updateTime,
                    remark,
                    group_id: groupId,
                }
            );
            this.ctx.body = this.Common.success({ data: findData });
            // 通知人员
            await this.socketService.mailApplyAddMsg({
                user_id: [user_from_id],
                expand: { remark, user_id, time: new Date().getTime(), id: findData.id },
            });
            return;
        }

        const data = await this.mail_apply_list_model.create({
            user_id,
            user_from_id,
            remark,
            createTime: new Date().getTime(),
            updateTime: new Date().getTime(),
            group_id: groupId,
        } as mail_apply_list);
        this.ctx.body = this.Common.success({ data });
        // 通知人员
        await this.socketService.mailApplyAddMsg({
            user_id: [user_from_id],
            expand: { remark, user_id, time: new Date().getTime(), id: data.id },
        });
    }

    /**
     * 同意好友申请
     * */
    @Post('/agreeApplyMail')
    @Validate()
    async agreeApplyMail(@Body() params: agreeApplyDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const findData = await this.mail_apply_list_model.findOne({ _id: id, user_from_id: user_id }).exec();
        if (!findData) {
            return this.Common.error({ msg: '暂无本条好友申请' });
        }
        if (findData.status === 1) {
            return this.Common.error({ msg: '已同意申请' });
        }

        await this.mail_apply_list_model.updateOne(
            { _id: id },
            {
                status: 1,
                updateTime: new Date().getTime(),
            }
        );
        // 无原来好友关系 创建新的
        if (!findData.group_id) {
            try {
                await this.groupService.getFirstGroupId({ ascriptionId: findData.user_from_id, sendUserId: findData.user_id });
                this.ctx.body = this.Common.success({ msg: '已同意申请' });
                // 通知人员
                await this.socketService.mailAgreeAddMsg({
                    user_id: [findData.user_id],
                    expand: { user_id: findData.user_from_id, time: new Date().getTime() },
                });
            } catch (e) {
                return this.Common.error({ data: e.data, msg: e.msg });
            }
            return;
        }
        await this.groupService.updGroup({
            id: findData.group_id,
            updData: {
                status: 0,
            },
        });
        this.ctx.body = this.Common.success({ msg: '已同意申请' });
        // 通知人员
        await this.socketService.mailAgreeAddMsg({
            user_id: [findData.user_id],
            expand: { user_id: findData.user_from_id, time: new Date().getTime() },
        });
    }

    /**
     * 拒绝好友申请
     * */
    @Post('/refuseApplyMail')
    @Validate()
    async refuseApplyMail(@Body() params: agreeApplyDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        const { id } = params;
        const findData = await this.mail_apply_list_model.findOne({ _id: id, user_from_id: user_id }).exec();
        if (!findData) {
            return this.Common.error({ msg: '暂无本条好友申请' });
        }
        if (findData.status === 1) {
            return this.Common.error({ msg: '已同意申请' });
        }
        if (findData.status === 2) {
            return this.Common.error({ msg: '已拒绝申请' });
        }

        await this.mail_apply_list_model.updateOne(
            { _id: id },
            {
                status: 2,
                updateTime: new Date().getTime(),
            }
        );

        this.ctx.body = this.Common.success({ msg: '已拒绝申请' });
        // 通知人员
        await this.socketService.mailRefuseAddMsg({
            user_id: [findData.user_id],
            expand: { user_id: findData.user_from_id, time: new Date().getTime() },
        });
    }

    /**
     * 获取好友申请列表
     * */
    @Get('/getApplyMails')
    @Validate()
    async getApplyMails(@Query() params: getApplyDTO, @Headers() header: headerDTO) {
        const user_id = header.user_id;
        // const { user_id } = params;
        const data = await this.mail_apply_list_model
            .find({
                user_from_id: user_id,
            })
            .exec();
        return this.Common.success({ data });
    }

    /**
     * 获取好友列表
     * */
    @Get('/getMails')
    @Validate()
    async getMails(@Query() params: getApplyDTO, @Headers() header: headerDTO) {
        // const { user_id } = params;
        const user_id = header.user_id;
        const select = ['newsContentTime', 'newsContent', 'name', 'avatar', 'user_id', 'admin_user_id', 'user_child_list', 'type', 'status'];
        const data = await this.groupService.getLikeGroup(
            {
                // user_id,
                user_child_id: { $all: [user_id] },
                type: 0,
                status: 0,
            },
            'all',
            select
        );
        return this.Common.success({ data });
    }

    /**
     * 获取黑名单列表
     * */
    @Get('/getBlackMails')
    @Validate()
    async getBlackMails(@Query() params: getApplyDTO, @Headers() header: headerDTO) {
        const { user_id } = header;
        const data = await this.groupService.getLikeGroup(
            {
                user_child_id: { $all: [user_id] },
                type: 0,
                status: 2,
                black_id: {
                    $ne: String(user_id),
                },
            },
            'all'
        );
        // const filterData = data.filter(res => {
        //     return !res.black_id.includes(String(user_id));
        // });
        return this.Common.success({ data });
    }

    /**
     * 拉黑
     * */
    @Post('/addBlackMail')
    @Validate()
    async addBlackMail(@Body() params: addBlackMailDTO, @Headers() header: headerDTO) {
        const { id } = params;
        const { user_id } = header;
        const mailData = await this.groupService.getLikeGroup({ _id: id, type: 0 });
        if (!mailData) {
            return this.Common.error({ msg: '暂无好友关系信息' });
        }
        const black_id = mailData.black_id;
        if (black_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您已被拉黑' });
        }
        const user_child_id = mailData.user_child_id.filter(res => {
            return res !== String(user_id);
        });
        const user_from_id = user_child_id[0];
        if (black_id.includes(String(user_from_id))) {
            return this.Common.error({ msg: '已将对方拉黑' });
        }
        black_id.push(String(user_from_id));
        await this.groupService.updGroup({ id, updData: { status: 2, black_id } });
        this.ctx.body = this.Common.success({ msg: '拉黑成功' });
        // 通知人员
        await this.socketService.mailBlackAddMsg({
            user_id: [user_from_id],
            expand: { user_id: user_id, time: new Date().getTime(), groupId: mailData.id },
        });
    }

    /**
     * 取消拉黑
     * */
    @Post('/delBlackMail')
    @Validate()
    async delBlackMail(@Body() params: groupSetEstoppelDTO, @Headers() header: headerDTO) {
        const { id } = params;
        const { user_id } = header;
        const mailData = await this.groupService.getLikeGroup({ _id: id, type: 0 });
        if (!mailData) {
            return this.Common.error({ msg: '暂无好友关系信息' });
        }
        if (mailData.status === 0) {
            return this.Common.error({ msg: '未将对方拉黑，无法取消' });
        }
        const black_id = mailData.black_id;
        if (black_id.includes(String(user_id))) {
            return this.Common.error({ msg: '您已被拉黑，无法取消' });
        }
        const user_child_id = mailData.user_child_id.filter(res => {
            return res !== String(user_id);
        });
        const user_from_id = user_child_id[0];
        const index = black_id.findIndex(res => {
            return res === String(user_from_id);
        });
        if (index === -1) {
            return this.Common.error({ msg: '未将对方拉黑，无法取消' });
        }
        black_id.splice(index, 1);
        await this.groupService.updGroup({ id, updData: { status: 0, black_id } });
        this.ctx.body = this.Common.success({ msg: '取消拉黑成功' });
        // 通知人员
        await this.socketService.mailBlackDelMsg({
            user_id: [user_from_id],
            expand: { user_id: user_id, time: new Date().getTime(), groupId: mailData.id },
        });
    }

    /**
     * 删除好友
     * */
    @Post('/delMail')
    @Validate()
    async delMail(@Body() params: groupSetEstoppelDTO, @Headers() header: headerDTO) {
        const { id } = params;
        const { user_id } = header;
        const mailData = await this.groupService.getLikeGroup({ _id: id, type: 0 });
        if (!mailData) {
            return this.Common.error({ msg: '暂无好友关系信息' });
        }
        const user_child_id = mailData.user_child_id.filter(res => {
            return res !== String(user_id);
        });
        const user_from_id = user_child_id[0];
        await this.groupService.group_del({ groupId: id });
        this.ctx.body = this.Common.success({ msg: '删除成功' });
        await this.socketService.mailDelMsg({ user_id: [user_from_id], expand: { groupId: id, time: new Date().getTime(), user_id: user_id } });
    }
}
