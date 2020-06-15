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

const Cvlc = require('cvlc');
const logger = require('./logger');

class mediaPlayer {
    constructor() {
        this.players = [];
    }

    playUrl(inChannelId, inTargetUrl, callback) {
        let newPlayerObj = {
            inChannelId: inChannelId,
            exec: new Cvlc({ debug: true }),
            playStatus: 0,
            playTime: 0,
            notiTime: 0,
            mediaTimer: 0
        };
        newPlayerObj.exec.play(inTargetUrl, () => {
            newPlayerObj.playStatus = 1;
            logger.info("play start");
            callback();
        });
        this.players.push(newPlayerObj);
    }
    
    checkStop(player) {
        new Promise((resolve, reject) => {
            player.exec.cmd('stats', function gotResponse(err, response) {
                setTimeout(() => {
                    resolve(response);
                }, 200);
            });
        }).then((res1) => {
            player.exec.cmd('stats', function gotResponse(err, res2) {
                const tmp1 = res1.replace(/[^0-9]/g, "");
                const tmp2 = res2.replace(/[^0-9]/g, "");
                if (tmp1 !== tmp2) {
                    player.exec.cmd('stop');
                }
            });
        });
    }

    actOnOther(inOrder, callback) {
        this.players.forEach((player, index) => {
            let inChannelId = player.inChannelId;
            let playTime = player.playTime;
            if (inOrder === 'pause' || inOrder === 'pauseR') {
                if (player.playStatus == 1) {
                    player.exec.cmd('pause');
                    this.checkStop(player);
                    player.playStatus = 2;
                    logger.info('[Media Player] Channel:' + inChannelId + ' Exec:Pause FromStatus: 1 toStatus: 2');
                    callback(inChannelId, 'paused', playTime);
                }
            } else if (inOrder === 'resume') {
                if (player.playStatus == 2) {
                    player.exec.cmd('pause');
                    player.playStatus = 1;
                    logger.info('[Media Player] Channel:' + inChannelId + ' Exec:Pause FromStatus: 2 toStatus: 1');
                    callback(inChannelId, 'resumed', playTime);
                }
            } else if (inOrder === 'stop' || inOrder === 'stopR') {
                player.exec.cmd('stop');
                logger.info('[Media Player] Channel:' + inChannelId + ' Exec: Stop');
                player.exec.destroy();
                this.players.splice(index, 1);
                callback(inChannelId, 'stopped', playTime);
            }
        });
    }

    stopPlay(inChannelId, callback) {
        this.players.forEach((player, index) => {
            if (player.inChannelId === inChannelId) {
                let playTime = player.playTime;
                player.exec.cmd('stop');
                logger.info('[Media Player] Channel:' + inChannelId + ' Exec:Stop FromStatus:' + player.playStatus + ' toStatus:0');
                clearInterval(player.mediaTimer);
                player.exec.destroy();
                this.players.splice(index, 1);
                callback(playTime);
            }
        });
    }
    resumePlay(inChannelId) {
        this.players.forEach((player, index) => {
            if (player.inChannelId === inChannelId && player.playStatus === 2) {
                player.exec.cmd('pause');
                logger.info('[Media Player] Channel:' + inChannelId + ' Exec:Resume FromStatus:' + player.playStatus + ' toStatus:1');
                player.playStatus = 1;
            }
        });
    }

    pausePlay(inChannelId) {
        this.players.forEach((player, index) => {
            if (player.inChannelId === inChannelId && player.playStatus === 1) {
                player.exec.cmd('pause');
                this.checkStop(player);
                logger.info('[Media Player] Channel:' + inChannelId + ' Exec:Pause FromStatus:' + player.playStatus + ' toStatus:2');
                player.playStatus = 2;
            }
        });
    }

    setPlayTimeout(inChannelId, inPlayNotiTime, callback) {
        this.players.forEach((player, index) => {
            if (player.inChannelId === inChannelId) {
                if (player.notiTime === 0 || inPlayNotiTime !== 0) {
                    player.notiTime = inPlayNotiTime;
                }
                if (!player.notiTime) player.notiTime = [];
                player.mediaTimer = setInterval(() => {
                    if (player.playStatus === 1) {
                        const curPlayTime = player.playTime;
                        player.playTime = curPlayTime + 1;
                        player.exec.cmd('get_time', (err, response) => {
                            if (response === '\n') { //stopped 
                                player.playTime = 0;
                                player.notiTime = 0;
                                player.playStatus = 0;
                                clearInterval(player.mediaTimer);
                                player.exec.destroy();
                                this.players.splice(index, 1);
                                callback('complete', player.playTime);
                            }
                        });
                        for (let i = 0; i < player.notiTime.length; ++i) {
                            if (player.notiTime[i] <= player.playTime) {
                                player.notiTime.splice(i, 1);
                                callback('noti', player.playTime);
                                break;
                            }
                        }
                    } else {
                        clearInterval(player.mediaTimer);
                    }
                }, 1000);
            }
        });
    }
}


module.exports = mediaPlayer;
