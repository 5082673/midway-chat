'use strict';
// import { Api } from './util/api';
import { ChatController } from '../modules/chat/controller/chat';
const chat = new ChatController();
module.exports = app => {
    // app.ws.use(async (ctx, next) => {
    //     await next();
    // });
    app.ws.route('/ws/chat', chat.connect);
};
