/**
 * @desc Socker
 * @time 2020年1月26日01:47:41
 * @author veaba
 * */

import {getKeysDB, insertOne, isHasOne, updateOne} from "../mongo/curd";
import {_sid_obj} from "./utils";
import {getTime} from 'date-fns'
import {ReportInterface} from "../interface/interface";
import {isNumber, isObject} from "./check";
import {_success, _error} from "../app";
import {delKey, getHash} from "../redis/redis";

/**
 * @desc 记录socket连接数，新连接插入，断开更新
 * @param socket {Object}
 * */
export const connectSocket = async (socket: any) => {
    const {id, handshake} = socket;
    const {issued} = handshake;
    await insertOne({..._sid_obj(id), noAuthCount: 1, beginTime: issued}, 'sockets');
    socket.on('disconnect', async () => {
        const {id} = socket;
        const {sid} = _sid_obj(id);
        await updateOne({sid}, {..._sid_obj(id), endTime: getTime(new Date())}, 'sockets');
        await delKey(sid)
    })
};

/**
 * @desc 收到消息
 * @report 需要检查权限
 * @feat 非授权访问下，有计数超过3次的socket，将主动断开链接
 * */
export const onSocket = async (socket: any, eventName: string) => {
    const {id, nsp} = socket;
    const {name} = nsp || {};   // 频道
    const {sid} = _sid_obj(id);
    socket.on(eventName, async (data: any) => {
        switch (eventName) {
            // channel->report
            case 'report':
                // 检查权限，redis 不存在sid则
                if (!await getHash(sid)) {
                    const {noAuthCount = 0}: any = await getKeysDB({sid}, ['noAuthCount'], 'sockets');
                    // 开始计数，如果超过3次未授权，则服务端主动关闭客户端的连接
                    if (noAuthCount > 3) {
                        socket.disconnect();
                        return
                    }
                    await updateOne({sid}, {$inc: {noAuthCount: 1}}, 'sockets');
                    await _success('/broadcast', 'auth', data, 2403, '未授权访问，次数 ' + noAuthCount);
                }
                const reqData: ReportInterface.insert = data;
                let logType = '';
                if (!isObject(reqData)) {
                    logType = 'paramsError';
                } else {
                    // 先确认必填项,校验时间类型
                    if (reqData.country && reqData.province && reqData.reportDate && isNumber(reqData.reportDate) && reqData.newsUrl && (reqData.count || reqData.cure || reqData.dead || reqData.suspected)) {
                        logType = 'success';
                        // 拆开count、dead、cure 治愈，循环插入
                        // console.info('成功==========');
                        await insertForReport(reqData.count, {...reqData, isConfirm: true}, sid, 'reports');
                        await insertForReport(reqData.dead, {...reqData, isDead: true}, sid, 'reports');
                        await insertForReport(reqData.cure, {...reqData, isCure: true}, sid, 'reports');
                        await insertForReport(reqData.suspected, {...reqData, isSuspected: true}, sid, 'reports')
                    } else {
                        // console.info('失败=========');
                        // console.info('==x=> ', reqData.country && reqData.province && reqData.reportDate && isNumber(reqData.reportDate));
                        // console.info('==o=> ', reqData.newsUrl && (reqData.count || reqData.cure || reqData.dead || reqData.suspected));
                        // 告诉前端，这里不错其他细分错误了
                        const channel = (name || '').replace('/', '', '');
                        await _error(channel, eventName, reqData)
                    }
                }
                // noAuthCount
                await logSocket(socket, data, name, eventName, logType);
                break;
            case 'xx'://todo
                break;
            default:
                throw new Error('未能识别Channel类型');
        }
    })
};


/**
 * @desc ageChart,疫情感染年龄分布 饼图 {}，各阶段的年龄
 * */
const ageChart = async () => {

};


/**
 * @desc sexChart,疫情感染性别分布，饼图
 * */
const sexChart = async () => {

};


/**
 * @desc statisticsChart,疫情生命特征统计分布 柱状图 {count确诊,dead陨落,cure治愈,suspected疑似,track追踪}
 * */
const statisticsChart = async () => {

};


/**
 * @desc worldMap, 中间那个大地图所需的数据
 * */
const worldMap = async () => {

};


/**
 * @desc chinaTotalChart,中国境内统计的横向 柱状带小柱图，有新数据会动，会排序 {count确诊,dead陨落,cure治愈,suspected疑似,track追踪,province}省份
 * */
const chinaTotalChart = async () => {

};


/**
 * @desc loveChart,爱心地图，迁徙线，红点小红心，表示从x国，x地到中国境内的资助，在大地图上展示
 * */
const loveChart = async () => {

};


/**
 * @desc chartPieChart,省份占比
 * */
const chartPieChart = async () => {

};


/**
 * @desc 循环插入
 * */
const insertForReport = async (num: number = 0, data: any, sid: string, collection_name: string) => {
    if (!num) {
        return
    }
    for (let i = 0; i <= num; i++) {
        await insertOne({...data, sid}, collection_name)
    }
};
/**
 * @desc 记录logs，error Log、success Log
 * @param socket
 * @param body
 * @param channel
 * @param eventName
 * @param logType
 * */
export const logSocket = async (socket: any, body: any, channel: string, eventName: string, logType: string) => {
    let insertBody = {};
    if (Array.isArray(body) || isObject(body)) {
        insertBody = body
    } else {
        insertBody = {data: body}
    }
    const {id, handshake} = socket;
    const {sid} = _sid_obj(id);
    const {headers, issued} = handshake; // 请求头
    await insertOne({
        sid,
        channel,
        body: {...insertBody},
        headers,
        eventName,
        reportTime: issued,
        logType
    }, 'logs');
};


/**
 * @desc 主动断开前端的连接，当发生恶意emit 的时候，主动断开前端的请求
 * @todo
 * */
export const disconnectSocket = async (socket: any) => {

};


/**
 * @desc 感觉type来传递成功或者失败
 * @todo
 * */
export const dealSocket = async (socket: any) => {


};

/**
 * @desc 收到消息并成功处理后，返回给前端的socket
 * @todo
 * */
export const successSocket = async (socket: any) => {

};


/**
 * @desc 收到消息并错误处理后，返回给前端的socket
 * @todo
 * */
export const errorSocket = async (socket: any) => {

};


/**
 * @desc socket auth
 * @todo
 * @return {boolean}
 * */

export const authSocket = async (socket: any) => {

};
