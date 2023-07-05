// 项目配置文件
// console.log(process.env.NODE_ENV, 'NODE_ENV');
const dev = {
    post: 29998,
    host: '127.0.0.1',
    requestUrl: {
        url: 'http://127.0.0.1',
        avatarUrl: '',
        loginUrl: '',
        nginxFdfsUrl: '',
    },
};
const pro = {
    post: 29999,
    host: '127.0.0.1',
    requestUrl: {
        url: 'http://127.0.0.1',
        avatarUrl: '',
        loginUrl: '',
        nginxFdfsUrl: '',
    },
};

let data = {
    post: 0,
    host: '',
    requestUrl: {
        url: '',
        avatarUrl: '',
        loginUrl: '',
        nginxFdfsUrl: '',
    },
};

switch (process.env.NODE_ENV) {
    case 'local':
        data = dev;
        break;
    case 'production':
        data = pro;
        break;
    default:
        data = dev;
        break;
}

export default {
    ...data,
    redis: {
        post: 6379,
        password: '123456',
    },
};
