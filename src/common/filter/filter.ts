// src/filter/validate.filter
import { Catch, Inject, Logger } from '@midwayjs/decorator';
import { MidwayValidationError } from '@midwayjs/validate';
import { Context } from 'egg';
import { Api } from '../util/api';
import { httpError, MidwayHttpError } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import * as dayjs from 'dayjs';

// 所有的未分类错误
@Catch()
export class DefaultErrorFilter {
    @Logger('defaultErrorLogger') defaultErrorLogger: ILogger;
    @Logger() logger: ILogger;
    @Inject() api: Api;
    async catch(err: Error, ctx: Context) {
        const returnParams = await this.api.error({
            msg: err.message,
        });
        try {
            const data = JSON.stringify({
                type: 'DefaultError',
                data: {
                    url: ctx.request.url,
                    query: ctx.query,
                    body: ctx.request.body,
                    header: ctx.request.header,
                    resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    returnParams,
                },
            });
            this.defaultErrorLogger.warn(data);
        } catch (e) {
            this.logger.error(new Error('apiRequest error'));
        }
        return returnParams;
    }
}

// 校验参数过滤器
@Catch(MidwayValidationError)
export class ValidateErrorFilter {
    @Inject() api: Api;
    @Logger('apiRequestLogger') apiRequestLogger: ILogger;
    @Logger() logger: ILogger;
    async catch(err: MidwayValidationError, ctx: Context) {
        const returnParams = await this.api.error({
            msg: '参数校验失败 ' + err.message,
        });
        try {
            const data = JSON.stringify({
                type: 'ValidateError',
                data: {
                    url: ctx.request.url,
                    query: ctx.query,
                    body: ctx.request.body,
                    header: ctx.request.header,
                    resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    returnParams,
                },
            });
            this.apiRequestLogger.warn(data);
        } catch (e) {
            this.logger.error(new Error('apiRequest error'));
        }
        return returnParams;
    }
}

// 404
@Catch(httpError.NotFoundError)
export class NotFoundFilter {
    @Inject() api: Api;
    @Logger('apiRequestLogger') apiRequestLogger: ILogger;
    @Logger() logger: ILogger;
    async catch(err: MidwayHttpError, ctx: Context) {
        const returnParams = await this.api.error({
            msg: '方法不存在 ' + ctx.request.url,
        });
        try {
            const data = JSON.stringify({
                type: 'NotFound',
                data: {
                    url: ctx.request.url,
                    query: ctx.query,
                    body: ctx.request.body,
                    header: ctx.request.header,
                    resTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    returnParams,
                },
            });
            this.apiRequestLogger.warn(data);
        } catch (e) {
            this.logger.error(new Error('apiRequest error'));
        }
        return returnParams;
    }
}

export default [DefaultErrorFilter, ValidateErrorFilter, NotFoundFilter];
