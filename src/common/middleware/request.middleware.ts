import { Middleware, Logger, App, Inject } from '@midwayjs/decorator';
import { IMiddleware } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/web';
import * as dayjs from 'dayjs';
import { ILogger } from '@midwayjs/logger';
import { Application } from 'egg';
import { userService } from '../../modules/user/service/user';
@Middleware()
export class RequestMiddleware implements IMiddleware<Context, NextFunction> {
    @Logger('apiRequestLogger') apiRequestLogger: ILogger;

    @Logger() logger: ILogger;

    @App() app: Application;

    @Inject() requestService: userService;

    resolve() {
        return async (ctx: Context, next: NextFunction) => {
            const oldTime = new Date().getTime();
            ctx.header.userData = null;
            // 前置 可处理token等验证
            if (ctx.header.user_id) {
                ctx.header.user_id = String(ctx.header.user_id);
                const userData = await this.requestService.findUserDataRequest({ user_id: ctx.header.user_id });
                if (userData) {
                    try {
                        ctx.header.userData = JSON.parse(JSON.stringify(userData));
                    } catch (e) {}
                }
            }
            await next();
            // 后置
            // 记录请求数据日志
            try {
                const time = (new Date().getTime() - oldTime) / 1000;
                const data = JSON.stringify({
                    type: 'apiRequest',
                    data: {
                        url: ctx.request.url,
                        query: ctx.query,
                        body: ctx.request.body,
                        header: ctx.request.header,
                        resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                        returnParams: ctx.body,
                        pid: process.pid,
                        timeConsuming: time + 's',
                    },
                });
                this.apiRequestLogger.warn(data);
            } catch (e) {
                this.logger.error(new Error('apiRequest error'));
            }
        };
    }
}
