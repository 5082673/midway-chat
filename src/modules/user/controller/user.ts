import { Inject, Controller, App, Post, Body } from '@midwayjs/decorator';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';
import { Tool } from '../../../common/util/tool';

@Controller('/api/user')
export class UserController {
    @Inject() ctx: Context;

    @Inject() Common: Api;

    @Inject() tool: Tool;

    @App() app: Application;

    @Post('/login')
    async login(@Body() params) {
        const token: string = await this.tool.signSyncToken({
            payload: { aa: '小头仔' },
        });
        return this.Common.success({ data: token });
    }

    @Post('/test')
    async test(@Body() params) {
        const token = params.token;
        const data: any = await this.tool.decodeSyncToken({ token });
        return this.Common.success({ data });
    }
}
