import { EggPlugin } from 'egg';
export default {
    // static: false,
    // socket
    websocket: {
        enable: true,
        package: 'egg-websocket-plugin',
    },
} as EggPlugin;
