import { Application } from 'egg';
import { Provide, App, Inject } from '@midwayjs/decorator';
import { Api } from '../api';
import axios from 'axios';

@Provide()
export class request {
    @App()
    app: Application;
    @Inject() api: Api;
    // @ts-ignore
    private ax: axios.AxiosInstance;
    constructor() {
        this.ax = axios.create({
            baseURL: '',
            timeout: 300000,
        });
        this.ax.interceptors.request.use(
            config => {
                // config.headers.auth = 'xh ' + token;
                config.data = config.data || {};
                return config;
            },
            error => {
                // 发送失败
                console.log(error);
                return Promise.reject(error);
            }
        );
        this.ax.interceptors.response.use(
            response => {
                const dataAxios = response.data;
                const code = dataAxios.code;

                if (code !== 1) {
                    if (code < 0) {
                        return Promise.reject(dataAxios);
                    }
                    return Promise.reject(false);
                }
                return dataAxios;
            },
            error => {
                return Promise.reject(error);
            }
        );
        // const urls = this.getConfig();
        // this.urls.url = urls.url;
        // this.urls.avatarUrl = urls.avatarUrl;
        // this.urls.loginUrl = urls.loginUrl;
        // this.urls.nginxFdfsUrl = urls.nginxFdfsUrl;
    }

    async get({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'get',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async post({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async del({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'delete',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async put({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'put',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async patch({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'patch',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async option({ url = '', params = {}, headers = {} }) {
        return await this.ax({
            url,
            method: 'options',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    async upload({ url = '', params, headers = {} }) {
        return await this.ax({
            url,
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            data: params,
        });
    }

    // 获取文件head
    async getHead({ url = '' }) {
        return await this.ax.head(url);
    }
}
