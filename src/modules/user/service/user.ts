import { Context, Application } from 'egg';
import { App, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { RedisFunService } from '../../../common/service/redis';
import { Api } from '../../../common/util/api';
import { index } from '../../../common/util/request/apiList';

@Scope(ScopeEnum.Request, { allowDowngrade: true })
@Provide()
export class userService {
    @Inject() ctx: Context;
    @Inject() redis: RedisFunService;
    @Inject() api: Api;
    @App() app: Application;
    @Inject() requestIndex: index;

    /*
     * 通过接口查找用户信息
     * @description 使用接口查询其他库里的用户信息 比如调用其他后端提供查询用户接口
     * */
    async findUserDataRequest({ user_id = '' }) {
        // const userInfo: any = await this.requestIndex.getUserInfo({ params: { user_id }, headers: { xx: 'token' } });
        return { user_id, name: '大垃圾', avatar: '头像' };
    }
}
