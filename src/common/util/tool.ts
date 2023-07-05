import fs = require('fs-extra');
// import { resolve } from 'path';
import { Provide, Scope, ScopeEnum, Inject } from '@midwayjs/decorator';
import { JwtService } from '@midwayjs/jwt';
import { Jwt } from 'jsonwebtoken';
// import { createConnection } from 'net';
import { networkInterfaces, type } from 'os';
import { index as requestIndex } from '../../common/util/request/apiList/index';
import { request } from './request/apiRequest';

@Scope(ScopeEnum.Request, { allowDowngrade: true })
@Provide()
export class Tool {
    @Inject() jwtService: JwtService;
    @Inject() requestIndex: requestIndex;
    @Inject() request: request;

    /**
     * 将指定文件夹复制进目标文件夹
     * @param {String} A 要转移的文件或文件夹
     * @param {String} B 目标文件地址
     */
    async copyFolder(A: string, B: string) {
        return fs.copy(A, B);
    }

    /**
     * 创建文件目录 存在不进行创建
     * @param {String} newUtil 文件目录
     */
    async ensureDir(newUtil = '') {
        return fs.ensureDir(newUtil);
    }

    /**
     * 移动文件或目录
     * @param {String} A 要转移的文件
     * @param {String} B 目标文件地址
     * */
    async move(A: string, B: string) {
        return fs.move(A, B);
    }
    /**
     * 写入文件数据
     * @param {String} A 要写入的文件
     * @param {String} B 目标文件地址
     * */
    async outputFile(A: string, B: string) {
        return fs.outputFile(A, B);
    }

    /**
     * 获取本地文件大小
     * */
    getLocalFileSize(path = '') {
        return fs.statSync(path);
    }

    /**
     * 获取网络文件大小
     * */
    async getNetFileSize(url = '') {
        const data = await this.request.getHead({ url });
        console.log(data);
        // const size = data.headers['content-length'];
        return data.headers['content-length'];
    }

    /**
     * 生成token
     * @param {Object} payload 加密数据源
     * */
    async signSyncToken({ payload = {} }) {
        // const privateKey: any = await fs.readFileSync(resolve('./secret_key/public.key'));
        const options: any = {
            // algorithm: 'RS256',
            expiresIn: 60 * 60 * 6,
        };
        return await this.jwtService.signSync(payload, 'jwt', options);
    }

    /**
     * 解密token
     * @param {String} token
     * */
    async decodeSyncToken({ token = '' }) {
        return await this.jwtService.decodeSync(token);
    }

    /**
     * 验证token
     * @param {String} token
     * */
    async verifySyncToken({ token = '' }): Promise<Jwt | string | boolean> {
        // const publicKey: any = await fs.readFileSync(resolve('./secret_key/public.key'));
        try {
            return await this.jwtService.verifySync(token, 'jwt');
        } catch (e) {
            return false;
        }
    }

    /**
     * 获取本地ip
     * */
    async getLocalIP() {
        const ifaces = networkInterfaces();
        const osType = type();
        let IP = '';
        switch (osType) {
            case 'Windows_NT':
                for (const dev in ifaces) {
                    const iface = ifaces[dev];

                    for (let i = 0; i < iface.length; i++) {
                        const { family, address, internal } = iface[i];

                        if (family === 'IPv4' && address !== '127.0.0.1' && !internal) {
                            return address;
                        }
                    }
                }
                break;
            case 'Linux':
            case 'Darwin': // mac操作系统
                IP = ifaces.eth0[0].address;
                break;
            default: // 其他操作系统
                break;
        }
        return IP;
    }

    /**
     * 获取公网IP
     */
    async getPublicIP() {
        return await this.requestIndex.getPublicIP();
    }
}
