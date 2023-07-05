import { App, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/decorator';
import { Application, Context } from 'egg';
import { Tool } from './tool';
/**
 * api返回统一方法
 */
@Scope(ScopeEnum.Request, { allowDowngrade: true })
@Provide()
export class Api {
    @Inject() baseDir;

    @Inject() ctx: Context;

    @Inject() tool: Tool;

    @App() app: Application;

    // 成功返回数据
    async success({ data = null, msg = '请求成功', expand = {}, code = 1 }): Promise<any> {
        return { code, data: data ?? '', msg, ...expand };
    }

    // 失败返回数据
    async error({ data = null, msg = '请求失败', expand = {}, code = -1 }): Promise<any> {
        return { code, data: data ?? '', msg, ...expand };
    }

    // 分页成功返回
    async pageSuccess({ data = null, msg = '请求成功', count = 0, page = 1, limit = 0, expand = {}, code = 1 }): Promise<any> {
        return { code, data: data ?? '', msg, count, page, limit, ...expand };
    }

    // 分页失败返回
    async pageError({ data = null, msg = '请求失败', count = 0, page = 1, limit = 0, expand = {}, code = -1 }): Promise<any> {
        return { code, data: data ?? '', msg, count, page, limit, ...expand };
    }

    // 全局唯一id
    async getSnowflakeId(len = 32, firstU = true) {
        /**
         * 本算法来源于简书开源代码，详见：https://www.jianshu.com/p/fdbf293d0a85
         * 全局唯一标识符（uuid，Globally Unique Identifier）,也称作 uuid(Universally Unique IDentifier)
         * 一般用于多个组件之间,给它一个唯一的标识符,或者v-for循环的时候,如果使用数组的index可能会导致更新列表出现问题
         * 最可能的情况是左滑删除item或者对某条信息流"不喜欢"并去掉它的时候,会导致组件内的数据可能出现错乱
         * v-for的时候,推荐使用后端返回的id而不是循环的index
         * @param {Number} len uuid的长度
         * @param {Boolean} firstU 将返回的首字母置为"u"
         * @param {Nubmer} radix 生成uuid的基数(意味着返回的字符串都是这个基数),2-二进制,8-八进制,10-十进制,16-十六进制
         */
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
        const uuid = [];
        const radix = chars.length;
        if (len) {
            // 如果指定uuid长度,只是取随机的字符,0|x为位运算,能去掉x的小数位,返回整数位
            for (let i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)];
        } else {
            let r;
            // rfc4122标准要求返回的uuid中,某些位为固定的字符
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            for (let i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | (Math.random() * 16);
                    uuid[i] = chars[i === 19 ? (r & 0x3) | 0x8 : r];
                }
            }
        }
        // 移除第一个字符,并用u替代,因为第一个字符为数值时,该guuid不能用作id或者class
        if (firstU) {
            uuid.shift();
            return 'u' + uuid.join('');
        }
        return uuid.join('');
    }

    // 解析token
    async getTokenData() {
        const token: any = await this.tool.decodeSyncToken({ token: this.ctx.request.body.token });
        // const token: any = this.ctx.request.body.token;
        return token;
    }
}
