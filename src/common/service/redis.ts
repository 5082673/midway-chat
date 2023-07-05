import { Provide } from '@midwayjs/decorator';
import { RedisServiceFactory } from '@midwayjs/redis';
import { InjectClient } from '@midwayjs/core';
import { RedisService } from '@midwayjs/redis';

@Provide()
export class RedisFunService {
    @InjectClient(RedisServiceFactory, 'redisA') redisA: RedisService;
    @InjectClient(RedisServiceFactory, 'redisB') redisB: RedisService;

    /**
     * 获取列表
     * @param {string} key 键
     * @param {boolean} isChildObject 元素是否为对象
     * @return { array } 返回数组
     */
    async getList(key, isChildObject = false) {
        let data = await this.redisA.lrange(key, 0, -1);
        if (isChildObject) {
            data = data.map(item => {
                return JSON.parse(item);
            });
        }
        return data;
    }

    /**
     * 设置列表
     * @param {string} key 键
     * @param {object|string} value 值
     * @param {string} type 类型：push和unshift
     * @param {Number} expir 过期时间 单位秒
     * @return { Number } 返回索引
     */
    async setList(key, value, type = 'push', expir = 0) {
        const { redisA } = this;
        if (expir > 0) {
            await redisA.expire(key, expir);
        }
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        if (type === 'push') {
            return redisA.rpush(key, value);
        }
        return redisA.lpush(key, value);
    }

    /**
     * 设置 redis 缓存
     * @param { String } key 键
     * @param {String | Object | array} value 值
     * @param { Number } expir 过期时间 单位秒
     * @return { String } 返回成功字符串OK
     */
    async set(key, value, expir = 0) {
        const { redisA } = this;
        if (expir === 0) {
            return redisA.set(key, JSON.stringify(value));
        }
        return redisA.set(key, JSON.stringify(value), 'EX', expir);
    }

    /**
     * 获取 redis 缓存
     * @param { String } key 键
     * @return { String | array | Object } 返回获取的数据
     */
    async get(key) {
        const { redisA } = this;
        const result = await redisA.get(key);
        return JSON.parse(result);
    }

    /**
     * redis 自增
     * @param { String } key 键
     * @param { Number } value 自增的值
     * @return { Number } 返回递增值
     */
    async incr(key, number = 1) {
        const { redisA } = this;
        if (number === 1) {
            return redisA.incr(key);
        }
        return redisA.incrby(key, number);
    }

    /** 修改列表
     *
     *
     */
    async update(key, index, value) {
        const { redisA } = this;
        value = JSON.stringify(value);
        return redisA.lset(key, index, value);
    }

    /**
     * 查询长度
     * @param { String } key
     * @return { Number } 返回数据长度
     */
    async strlen(key) {
        const { redisA } = this;
        return redisA.strlen(key);
    }

    /**
     * 删除指定key
     * @param {String} key
     */
    async remove(key) {
        const { redisA } = this;
        return redisA.del(key);
    }

    /**
     * 清空缓存
     */
    async clear() {
        return this.redisA.flushall();
    }

    /**
     * 获取用户所在进程
     * */
    async getUserPid({ key = '' }) {
        const { redisB } = this;
        const result = await redisB.get(key);
        return JSON.parse(result);
    }
}
