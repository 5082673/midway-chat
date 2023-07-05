const fs = require('fs-extra');

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
    await emptyDir('./script/typeorm_mysql_model');
    await copyFolder('./mysqlModel', './script/typeorm_mysql_model');
    await removeFloder('./mysqlModel');
};
load();
