import { Inject, Controller, App, Post, Files, Fields } from '@midwayjs/decorator';
import { Context, Application } from 'egg';
import { Api } from '../../../common/util/api';
import { OSSService } from '@midwayjs/oss';
import dayjs = require('dayjs');
import { Tool } from '../../../common/util/tool';
import { resolve } from 'path';

@Controller('/common')
export class GroupController {
    @Inject() ctx: Context;

    @Inject() Common: Api;

    @App() app: Application;

    @Inject() ossService: OSSService;

    @Inject() Tool: Tool;

    @Post('/upload')
    async upload(@Files() files, @Fields() fields) {
        if (!files || files.length === 0) {
            return this.Common.error({ msg: '请上传文件', data: '' });
        }
        const filePath = '/static/upload/' + dayjs().format('YYYYMMDD');
        const newUtil: string = resolve('./public' + filePath);
        await this.Tool.ensureDir(newUtil);
        const arr: any[] = [];
        for (const i in files) {
            const res: any = files[i];
            try {
                const filename: string = dayjs().format('YYYYMMDD_HHmmss') + '_' + (await this.Common.getSnowflakeId()) + '_' + res.filename;
                await this.Tool.copyFolder(res.data, newUtil + '/' + filename);
                const { size } = this.Tool.getLocalFileSize(newUtil + '/' + filename);
                res.size = size;
                res.sizeCompany = 'KB';
                res.url = filePath + '/' + filename;
                res.filename = filename;
                delete res.data;
                arr.push(res);
            } catch (e) {}
        }
        return this.Common.success({ data: arr });
    }

    @Post('/uploadOSS', { description: '上传oss' })
    async uploadOss(@Files() files, @Fields() fields) {
        if (!files || files.length === 0) {
            return this.Common.error({ msg: '请上传文件', data: '' });
        }
        const arr: any = [];
        for (const i in files) {
            try {
                const filename: string = dayjs().format('YYYYMMDD_HHmmss') + '_' + (await this.Common.getSnowflakeId()) + '_' + files[i].filename;
                const data = await this.ossService.put(filename, files[i].data);
                const expand = await this.ossService.head(filename);
                const size = expand?.res?.headers['content-length'] || 0;
                arr.push({ url: data.url, filename: data.name, size, sizeCompany: 'KB' });
            } catch (e) {}
        }
        return this.Common.success({ data: arr, msg: '上传成功' });
    }
}
