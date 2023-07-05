import { Rule, RuleType } from '@midwayjs/validate';
const requiredString = RuleType.string().required();
const requiredStringEmpty = RuleType.string().empty('');
// const requiredNumber = RuleType.number().required();
const requiredNumberEmpty = RuleType.number().empty();

export class sendSingleDTO {
    // @Rule(requiredString.error(new Error('接受消息人的userid 不能为空')))
    // ascriptionId: number | string;

    // @Rule(requiredString.error(new Error('发送人id 不能为空')))
    // user_id: number | string;

    // @Rule(requiredString.error(new Error('发送人名字 不能为空')))
    // sendName: string;

    @Rule(requiredString.error(new Error('聊天室id 不能为空')))
    groupId: number | string;

    @Rule(requiredString.error(new Error('消息类型 需为 text image mp4 mp3 voice word file goods 中的一种')))
    msgType: string;

    // @Rule(requiredString.error(new Error('聊天室类型 不能为空')))
    // type: number;

    @Rule(requiredString.error(new Error('消息内容 不能为空')))
    content: string;
}

export class getFirstGroupIdDTO {
    @Rule(requiredString.error(new Error('接受消息人的userid 不能为空')))
    ascriptionId: string;

    // @Rule(requiredString.error(new Error('发送人id 不能为空')))
    // user_id: string;
}

export class gatGroupDataDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class gatGroupListDTO {
    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class getOffLineMsgListDTO {
    // @Rule(requiredString.error(new Error('userid 不能为空')))
    // user_id: string;

    @Rule(requiredString.error(new Error('聊天室id 不能为空')))
    groupId: string;

    @Rule(requiredNumberEmpty)
    page: number;

    @Rule(requiredNumberEmpty)
    limit: number;
}

export class withdrawMsgDTO {
    @Rule(requiredString.error(new Error('消息id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('聊天室id 不能为空')))
    // groupId: string;

    // @Rule(requiredString.error(new Error('发送人id 不能为空')))
    // user_id: string;
    // @Rule(requiredString.error(new Error('消息发送时间戳 不能为空')))
    // msgTime: number;
}

export class readMsgDTO {
    @Rule(requiredString.error(new Error('消息id 不能为空')))
    ids: string;

    // @Rule(requiredString.error(new Error('聊天室id 不能为空')))
    // groupId: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class createGroupDTO {
    @Rule(requiredString.error(new Error('群组名称 不能为空')))
    name: string;

    @Rule(requiredStringEmpty)
    avatar: string;

    // @Rule(requiredString.error(new Error('群主user_id 不能为空')))
    // user_id: string;

    // @Rule(requiredNumber.error(new Error('群类型 校验失败')))
    // type: number;

    @Rule(requiredString.error(new Error('群成员userid至少传入一个')))
    user_child_id: string;
}

export class updGroupDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    @Rule(requiredStringEmpty)
    avatar: string;

    @Rule(requiredStringEmpty)
    name: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class groupAddUserDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;

    @Rule(requiredString.error(new Error('user_child_id 不能为空')))
    user_child_id: string;
}

export class updGroupRemarkDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    @Rule(requiredString.error(new Error('群公告 不能为空')))
    remark: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;

    type: number;
}

export class remarkReadDTO {
    @Rule(requiredString.error(new Error('公告id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class remarkListDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    @Rule(requiredNumberEmpty)
    page: number;

    @Rule(requiredNumberEmpty)
    limit: number;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class remarkDataDTO {
    @Rule(requiredString.error(new Error('公告id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class mailAddDTO {
    @Rule(requiredString.error(new Error('对方user_id 不能为空')))
    user_from_id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;

    @Rule(requiredStringEmpty)
    remark: string;
}

export class agreeApplyDTO {
    @Rule(requiredString.error(new Error('id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;
}

export class getApplyDTO {
    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;

    status: number;
}

export class addBlackMailDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    // @Rule(requiredString.error(new Error('user_id 不能为空')))
    // user_id: string;

    // @Rule(requiredString.error(new Error('对方user_id 不能为空')))
    // user_from_id: string;
}

export class groupSetEstoppelDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;
}

export class groupSetUserEstoppelDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    @Rule(requiredString.error(new Error('对方user_id 不能为空')))
    user_from_id: string;
}

export class shareGroupDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;

    // 超时时间
    overtime: number;

    // 备注
    remark: string;
}

export class shareGroupAddUserDTO {
    @Rule(requiredString.error(new Error('群组id 不能为空')))
    id: string;
}
