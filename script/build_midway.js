const fs = require('fs-extra');
const folderA = './dist';
const folderB = './build_dist/dist';
const buildFolder = './build_dist';

// 创建或清空目录
const emptyDir = folder => {
    return new Promise((resolve, reject) => {
        fs.emptyDir(folder, err => {
            if (err) {
                console.log('创建或清空目录失败');
                return reject(false);
            }
            console.log(`创建${folder}成功`);
            resolve(true);
        });
    });
};

//将指定文件夹转入目标文件夹
const copyFolder = (A, B) => {
    return new Promise((resolve, reject) => {
        fs.copy(A, B, err => {
            if (err) {
                console.log('复制文件夹失败');
                reject(false);
                throw err;
            }
            resolve(true);
        });
    });
};

// 删除文件或目录
const removeFloder = folder => {
    return new Promise((resolve, reject) => {
        fs.remove(folder, err => {
            if (err) {
                console.log('删除文件夹失败');
                reject(false);
                throw err;
            }
            resolve(true);
        });
    });
};

const load = async () => {
    // 创建最终打包文件夹
    await emptyDir(buildFolder);
    // 创建dist
    await emptyDir(folderB);
    // 移动dist
    await copyFolder(folderA, folderB);
    // 复制入口文件
    await copyFolder('./bootstrap.js', buildFolder + '/bootstrap.js');
    await copyFolder('./server.js', buildFolder + '/server.js');
    // 复制 package.json
    await copyFolder('./package.json', buildFolder + '/package.json');
    // 复制 tsconfig.json
    await copyFolder('./tsconfig.json', buildFolder + '/tsconfig.json');
    // 复制秘钥
    // await copyFolder('./secret_key', buildFolder + './secret_key');
    // 删除dist
    await removeFloder(folderA);
    console.log('success');
};
load();

module.exports = {
    emptyDir,
    copyFolder,
    removeFloder,
};
