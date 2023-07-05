import { Middleware, Logger, App, Inject } from '@midwayjs/decorator';
import { IMiddleware } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/web';
import * as dayjs from 'dayjs';
import { ILogger } from '@midwayjs/logger';
import { Application } from 'egg';
import { Tool } from '../util/tool';
import { Api } from '../util/api';
import jwt_router from '../../config/jwt_router';
@Middleware()
export class JwtMiddleware implements IMiddleware<Context, NextFunction> {
    @Logger('apiRequestLogger') apiRequestLogger: ILogger;

    @Logger() logger: ILogger;

    @App() app: Application;

    @Inject() Common: Api;

    @Inject() tool: Tool;

    resolve() {
        return async (ctx: Context, next: NextFunction) => {
            // return await next();
            // token验证
            const token: any = ctx.header?.token || null;
            if (!token) {
                ctx.body = this.Common.error({ msg: '请上传token' });
                try {
                    const data = JSON.stringify({
                        type: 'jwtRequest',
                        data: {
                            url: ctx.request.url,
                            query: ctx.query,
                            body: ctx.request.body,
                            header: ctx.request.header,
                            resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                            returnParams: ctx.body,
                        },
                    });
                    this.apiRequestLogger.warn(data);
                } catch (e) {
                    this.logger.error(new Error('apiRequest error'));
                }
                return;
            }
            const verifySyn = await this.tool.verifySyncToken({ token });
            if (!verifySyn) {
                ctx.body = this.Common.error({ msg: 'token验证失败' });
                try {
                    const data = JSON.stringify({
                        type: 'jwtRequest',
                        data: {
                            url: ctx.request.url,
                            query: ctx.query,
                            body: ctx.request.body,
                            header: ctx.request.header,
                            resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                            returnParams: ctx.body,
                        },
                    });
                    this.apiRequestLogger.warn(data);
                } catch (e) {
                    this.logger.error(new Error('apiRequest error'));
                }
                return;
            }
            await next();
            // await next();
        };
    }

    // 配置需要鉴权的路由地址
    public match(ctx: Context): boolean {
        return jwt_router.includes(ctx.path);
    }
}
