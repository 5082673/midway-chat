import { App, Configuration, Logger } from '@midwayjs/decorator';
import { ILifeCycle } from '@midwayjs/core';
import { join } from 'path';
import * as egg from '@midwayjs/web';
import { RequestMiddleware } from './common/middleware/request.middleware';
import { JwtMiddleware } from './common/middleware/jwt.middleware';
import { ILogger } from '@midwayjs/logger';
import * as redis from '@midwayjs/redis';
import * as validate from '@midwayjs/validate';
// import * as orm from '@midwayjs/typeorm';
import filter from './common/filter/filter';
import * as upload from '@midwayjs/upload';
import * as oss from '@midwayjs/oss';
import * as jwt from '@midwayjs/jwt';
import * as typegoose from '@midwayjs/typegoose';
import * as staticFile from '@midwayjs/static-file';
import * as crossDomain from '@midwayjs/cross-domain';

@Configuration({
    imports: [
        egg,
        redis,
        validate,
        // orm,
        upload,
        oss,
        jwt,
        typegoose,
        staticFile,
        crossDomain,
    ],
    importConfigs: [join(__dirname, './config')],
})
export class ContainerLifeCycle implements ILifeCycle {
    @App() app: egg.Application;

    @Logger() logger: ILogger;

    async onReady() {
        // const start = Date.now();
        // this.logger.debug('debug info');
        // this.logger.info('启动耗时 %d ms', Date.now() - start);
        // this.logger.warn('warning!');
        console.log('启动项目前执行的一些操作', process.pid);
        this.app.useMiddleware(JwtMiddleware);
        this.app.useMiddleware(RequestMiddleware);
        this.app.useFilter(filter);
    }
}
