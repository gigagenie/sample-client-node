
/*
 * Copyright 2020 KT AI Lab.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// --------------------------------------------------
// agentClient.js
// --------------------------------------------------

const fs = require('fs');
const MediaPlayer = require('./mediaPlayer');
const grpcChannel = require('./grpc_channel');
const logger = require('./logger');

class agentClient {
    constructor(inOpt) {
        this.grpcClient = grpcChannel.grpc_channel(inOpt.uuid);
        this.dssStatus = inOpt.initialDssStat;
        this.dssStatusKey = {};
        inOpt.initialDssStat.forEach((dssStat) => {
            this.dssStatusKey[dssStat] = true;
        });
        this.serviceM = null;
        this.sendVoiceStreamFlag = false;
        this.mediaPlayer = new MediaPlayer();
        this.recvStream = false;
        this.streamRecvCallback = null;
        this.streamRecvTimeout = null;
    }

    startVOCM() {
        this.sendJsonMsg('Req_VOCM', { cmdOpt: {}, dssStatus: this.dssStatus });
    }

    sendVoiceData(inData) {
        if (this.sendVoiceStreamFlag) {
            this.serviceM.write({ voice: inData });
        }
    }

    connectServiceM() {
        this.serviceM = this.grpcClient.serviceM();
        this.serviceM.on('error', this.processGrpcError);
        this.serviceM.on('data', (inData) => {
            this.processGrpcData(inData);
        });
        this.serviceM.on('end', this.processGrpcEnd);
    }

    disconnectServiceM() {
        this.serviceM.end();
        this.serviceM = null;
    }
    
    processGrpcError(error) {
        logger.info('[INFO] Error From ServiceM:' + error);
    }

    processGrpcEnd() {
        logger.info('[INFO] GRPC is End. Call Endcallback');
        if (this.onEnd !== undefined)
            this.onEnd();
    }

    // handing response
    processGrpcData(inData) {
        if (inData.mResponse === 'srvCommand') {
            logger.info('[INFO] Msg(Srv->Dev) >> msgType:' + inData.srvCommand.msgType + ' msgPayload:' + inData.srvCommand.msgPayload);
            const parsedMsgPayload = JSON.parse(inData.srvCommand.msgPayload);
            const firstOrder = this.processSrvCommand(inData.srvCommand.msgType, parsedMsgPayload.cmdOpt);
            if (firstOrder.rc === 200) {
                if (parsedMsgPayload.nextCmd !== undefined) {
                    const nextCmd = parsedMsgPayload.nextCmd;
                    const nextCmdOpt = parsedMsgPayload.nextCmdOpt;
                    const nextOrder = this.processSrvCommand(nextCmd, nextCmdOpt);
                }
            }
        } else if (inData.mResponse === 'voice') {
            if (this.recvStream) {
                if (this.streamRecvCallback !== null)
                    this.streamRecvCallback(inData.voice);
            }
        } else {
            logger.info('[INFO] Unknown Response Type:' + inData.mResponse);
        }
    }

    processSrvCommand(inCmd, inCmdOpt) {
        const processResult = {};
        processResult.rc = 200;
        logger.info('[ACTION] Process Cmd:' + inCmd + ' CmdOpt:' + JSON.stringify(inCmdOpt));
        switch (inCmd) {
            case 'Res_VOCM':
                //Nothing To Do
                break;

            case 'Req_STRV':
                //send streaming
                this.sendVoiceStreamFlag = true;
                break;

            case 'Req_STPV':
                logger.info('[ACTION] Voice Command Result:' + inCmdOpt.uword);
                console.log('STT_Result: ' + inCmdOpt.uword);
                this.sendVoiceStreamFlag = false;
                break;

            case 'Req_PLMD':
                //process currently playing media
                this.mediaPlayer.actOnOther(inCmdOpt.actOnOther, (inChannelId, inStatus, inPlayTime) => {
                    this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inChannelId, status: inStatus, playTime: inPlayTime } });
                });

                if (inCmdOpt.url === undefined) {
                    this.streamRecvCallback = (streamData) => {
                        fs.writeFileSync('./tts.wav', streamData, 'binary');
                        const playTime = (streamData.length - 40) / (16000 * 2);
                        this.mediaPlayer.playUrl(inCmdOpt.channel, './tts.wav', () => {
                            logger.info('[ACTION] Media Play Started. Channel:' + inCmdOpt.channel);
                            this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: 'started', playTime: 0 } });
                        });
                        this.streamRecvTimeout = setTimeout(() => {
                            logger.info('[ACTION] Media Play Completed. Channel:' + inCmdOpt.channel);
                            this.mediaPlayer.stopPlay(inCmdOpt.channel, (_) => {
                                this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: 'complete', playTime: Math.round(playTime * 1000) } });
                            });
                        }, playTime * 1000);
                    };
                    this.recvStream = true;
                } else {
                    this.mediaPlayer.playUrl(inCmdOpt.channel, inCmdOpt.url, () => {
                        logger.info('[ACTION] Media Play Started(url). Channel:' + inCmdOpt.channel);
                        this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: 'started', playTime: 0 } });
                    });
                    this.mediaPlayer.setPlayTimeout(inCmdOpt.channel, inCmdOpt.playNotiTime, (checkStatus, playedTime) => {
                        this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: checkStatus, playTime: playedTime } });
                    });
                }

                if (inCmdOpt.metaInfo && inCmdOpt.metaInfo.mesg && inCmdOpt.metaInfo.mesg !== "") {
                    console.log("RES_TTS: " + inCmdOpt.metaInfo.mesg);
                }
                break;

            case 'Req_UPMD':
                if (inCmdOpt.act === 'stop') {
                    if (inCmdOpt.url === undefined) {
                        clearTimeout(this.streamRecvTimeout);
                    }
                    this.mediaPlayer.stopPlay(inCmdOpt.channel, (playTime) => {
                        this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: 'stopped', playTime: playTime } });
                    });
                } else if (inCmdOpt.act === 'pause') {
                    this.mediaPlayer.pausePlay(inCmdOpt.channel);
                    this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: 'paused', playTime: 0 } });
                } else if (inCmdOpt.act === 'resume') {
                    this.mediaPlayer.resumePlay(inCmdOpt.channel);
                    this.mediaPlayer.setPlayTimeout(inCmdOpt.channel, inCmdOpt.playNotiTime, (checkStatus, playedTime) => {
                        this.sendJsonMsg('Upd_MEST', { cmdOpt: { channel: inCmdOpt.channel, status: checkStatus, playTime: playedTime } });
                    });
                }
                break;

        }

        if (inCmdOpt.setDssStatus !== undefined) {
            inCmdOpt.setDssStatus.forEach((setDssStat) => {
                this.dssStatusKey[setDssStat] = true;
            });
            this.reSetDss();
        }

        if (inCmdOpt.clearDssStatus !== undefined) {
            inCmdOpt.clearDssStatus.forEach((clearDssStat) => {
                const delResult = delete this.dssStatusKey[clearDssStat];
                logger.info('[INFO] Clear Dss Status Key:' + clearDssStat + ' success:' + delResult);
            });
            this.reSetDss();
        }

        return processResult;
    }

    reSetDss() {
        const dssKeys = Object.keys(this.dssStatusKey);
        this.dssStatus = dssKeys;
        logger.info('[INFO] reset dss status:' + JSON.stringify(this.dssStatus));
    }

    async sendJsonMsg(inMsgType, inMsgPayloadJson) {
        const payload = JSON.stringify(inMsgPayloadJson);
        logger.info('[ACTION-SENDMSG] devCommand:' + inMsgType + ' Payload:' + payload);
        if (this.grpcClient === null)
            await this.connectGrpc();
        this.serviceM.write({ devCommand: { msgType: inMsgType, msgPayload: payload } });
        if (inMsgPayloadJson.cmdOpt.status && inMsgPayloadJson.cmdOpt.status === "complete") {
            this.mediaPlayer.stopPlay(inMsgPayloadJson.cmdOpt.channel, (playTime) => { });
        }
    }
}

module.exports = agentClient;
