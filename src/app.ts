import Ioredis from 'ioredis';
import config from './config/config';
class AppBootHook {
    public app;
    constructor(app) {
        this.app = app;
    }

    configWillLoad() {
        // 此时 config 文件已经被读取并合并，但是还并未生效
        // 这是应用层修改配置的最后时机
        // 注意：此函数只支持同步调用
    }

    async didLoad() {
        // 所有的配置已经加载完毕
        // 可以用来加载应用自定义的文件，启动自定义的服务
    }

    async willReady() {
        // 所有的插件都已启动完毕，但是应用整体还未 ready
        // 可以做一些数据初始化等操作，这些操作成功才会启动应用
        // 例如：从数据库加载数据到内存缓存
    }

    async didReady() {
        // 应用已经启动完毕
        const app = this.app;
        this.app.ioredis = new Ioredis({
            port: config.redis.post,
            host: config.host,
            db: 8,
            password: config.redis.password,
        });
        // const ctx = await app.createAnonymousContext();
        //多进程通讯接收  监听事件'offline'信息
        app.messenger.on('offline', user_id => {
            if (app.ws.user[user_id]) {
                app.ws.user[user_id].send(
                    JSON.stringify({
                        msg: '你的账号在其他设备登录',
                        data: '',
                        code: -1,
                    })
                );
                app.ws.user[user_id].close();
                try {
                    delete app.ws.user[user_id];
                } catch (e) {}
            }
        });
        //多进程通讯接收  监听事件'send'信息
        console.log('egg-app开始监听', process.pid);
        app.messenger.on('send', e => {
            const { user_id, data } = e;
            if (app.ws.user && app.ws.user[user_id]) {
                app.ws.user[user_id].send(JSON.stringify(data));
            }
        });
        // 用户加入所属房间
        app.messenger.on('userJoinRooms', async e => {
            const { user_id, groupIds } = e;
            for (const i in groupIds) {
                const id = groupIds[i];
                await app.ws.user[user_id].room.join(id);
            }
        });
    }

    async serverDidReady() {
        // http / https server 已启动，开始接受外部请求
        // 此时可以从 app.server 拿到 server 的实例
    }
}

module.exports = AppBootHook;
