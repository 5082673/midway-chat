import { Inject, App, WSController, OnWSConnection, Query } from '@midwayjs/decorator';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';

@WSController('/ws/chat')
export class SocketIOController {
    @Inject() ctx: Context;

    @Inject() Common: Api;

    @App() app: Application;

    @OnWSConnection()
    async connect(@Query() params) {
        console.log(params);
        console.log('on client connect', this.ctx.id);
    }
}
