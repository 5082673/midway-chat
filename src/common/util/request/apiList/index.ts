import { Provide, Inject } from '@midwayjs/decorator';
import { request } from '../apiRequest';
import config from '../../../../config/config';
const { url } = config.requestUrl;
@Provide()
export class index {
    @Inject() request: request;
    async getIndex() {
        return await this.request.get({ url, params: { xx: 'token' } });
    }

    /**
     * 获取公网IP
     */
    async getPublicIP() {
        const url = 'http://ip.taobao.com/service/getIpInfo.php?ip=myip';
        const data = await this.request.get({ url });
        console.log(data);
        return data;
    }

    // 获取用户信息
    async getUserInfo({ params = { user_id: '1' }, headers = { xx: 'token' } }) {
        return await this.request.get({ url: url + '/api/userInfo', params, headers });
    }
}
