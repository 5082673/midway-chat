import { MidwayConfig, MidwayAppInfo } from '@midwayjs/core';
import config from './config';
import { model as mongooseModel } from './model/mongoose';
import { model as mysqlModel } from './model/mysql';
import { uploadWhiteList } from '@midwayjs/upload';
import { resolve } from 'path';
const fs = require('fs-extra');
const host = config.host;
export default (appInfo: MidwayAppInfo) => {
    fs.ensureDirSync('./public/html');
    return {
        // use for cookie sign key, should change to your own and keep security
        keys: 'mo_midway',
        bodyParser: {
            formLimit: '10mb',
            jsonLimit: '10mb',
            textLimit: '10mb',
            xmlLimit: '10mb',
        },
        egg: {
            port: config.post,
        },
        redis: {
            clients: {
                redisA: {
                    host,
                    port: config.redis.post,
                    password: config.redis.password,
                    db: 7,
                },
                redisB: {
                    host,
                    port: config.redis.post,
                    password: config.redis.password,
                    db: 6,
                },
            },
        },
        websocket: {
            redis: {
                host,
                port: config.redis.post,
                password: config.redis.password,
                // db: 6,
            },
            useAppMiddlewares: false,
        },
        validate: {
            validationOptions: {
                allowUnknown: true, // 全局生效
            },
        },
        midwayLogger: {
            default: {
                dir: './logs/devLogs',
                // 单个日志切割大小
                maxSize: '100m',
                // 日志保存时间
                maxFiles: '90d',
            },
            clients: {
                apiRequestLogger: {
                    fileLogName: 'apiRequest.log',
                },
                defaultErrorLogger: {
                    fileLogName: 'defaultError.log',
                },
            },
        },
        typeorm: {
            dataSource: {
                default: {
                    type: 'mysql',
                    host,
                    port: 3306,
                    username: 'momomo',
                    password: '123456',
                    database: 'momomo',
                    synchronize: false, // 如果第一次使用，不存在表，有同步的需求可以写 true
                    logging: false,
                    // 配置实体模型 或者 entities: '/entity',
                    entities: [...mysqlModel],
                    dateStrings: true,
                    cache: true,
                },
            },
        },
        mongoose: {
            dataSource: {
                default: {
                    uri: `mongodb://${host}:27017`,
                    options: {
                        useNewUrlParser: true,
                        useUnifiedTopology: true,
                        // user: 'admin',
                        // pass: '123456',
                    },
                    // 关联实体 './modules/chat/mongodb'
                    entities: [...mongooseModel],
                },
            },
        },
        upload: {
            // mode: UploadMode, 默认为file，即上传到服务器临时目录，可以配置为 stream
            mode: 'file',
            // fileSize: string, 最大上传文件大小，默认为 10mb
            fileSize: '50mb',
            // whitelist: string[]，文件扩展名白名单
            whitelist: uploadWhiteList.filter(ext => ext !== '.pdf'),
            // tmpdir: string，上传的文件临时存储路径
            tmpdir: resolve('./public/static/upload/temporary'),
            // cleanTimeout: number，上传的文件在临时目录中多久之后自动删除，默认为 5 分钟
            cleanTimeout: 5 * 60 * 1000,
            // base64: boolean，设置原始body是否是base64格式，默认为false，一般用于腾讯云的兼容
            base64: false,
        },
        oss: {
            // normal oss bucket
            client: {
                accessKeyId: '',
                accessKeySecret: '',
                bucket: '',
                endpoint: '',
                timeout: '60s',
                multipart: {
                    mode: 'file',
                    fileSize: '50mb',
                },
            },
        },
        jwt: {
            secret: 'jwt',
            // secret: fs.readFileSync(resolve('./secret_key/public.key')), // fs.readFileSync('xxxxx.key')
            expiresIn: '2d', // https://github.com/vercel/ms
        },
        staticFile: {
            dirs: {
                // default: {
                //     prefix: '',
                //     dir: '../public',
                // },
                static: {
                    // 要添加的 URL 前缀，默认为 ''
                    prefix: '/static/',
                    //是否在初始化缓存
                    preload: false,
                    // 默认情况下，文件的缓存控制最长期限   60 * 60 * 24 * 365 60秒 * 60分 * 24小时 * 365天
                    maxAge: 60 * 5,
                    // 实际放置的目录
                    dir: resolve('./public/static'),
                    // 将文件存储在内存中，而不是在每个请求时从文件系统流式传输
                    buffer: true,
                    // 当请求的接受编码包含 gzip 时，文件将由 gzip 压缩
                    gzip: false,
                    // 尝试使用从磁盘加载的gzip文件，如nginx gzip_static
                    usePrecompiledGzip: false,
                    // 初始化时未缓存文件使用动态加载文件
                    dynamic: true,
                    //  可选的缓存控制标头。重写。options.maxAge
                    // cacheControl: 'options.maxAge',
                    //函数|数组） - 在初始化目录中过滤文件，例如 - 跳过非构建（源）文件。如果数组集 - 仅允许列出的文件
                    // filter: [] | function
                    //别名的对象映射
                    // alias: {
                    //     '/': '/index.html',
                    // },
                },
                html: {
                    prefix: '/html/',
                    dir: resolve('./public/html'),
                    // alias: {
                    //     '/': '/index.html',
                    // },
                },
            },
        },
        // 跨域
        cors: {
            credentials: false,
        },
        security: {
            csrf: {
                enable: false,
            },
        },
    } as MidwayConfig;
};
