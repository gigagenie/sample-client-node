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

const logger = require(__dirname+'/src/logger');
const auth = require(__dirname+'/src/auth.js');
const record = require('node-record-lpcm16');
const AgentClient = require(__dirname+'/src/agentClient');
const { clientInfo } = require(__dirname+'/src/client');
const startOption = {
	uuid: auth.authorize(clientInfo, __dirname+'/config/uuid.json'),
	initialDssStat: ['SU:016', 'SU:027', 'SI:002', 'SG:000'] //Launcher Main, HDMI COnnected, Remote Voice Input, Nobody Here
};

const grpcAgent = new AgentClient(startOption);
grpcAgent.onEnd = () => {
	console.log('GRPC Ended..');
};

grpcAgent.connectServiceM();

//let mic;
function initMic() {
	return record.start({
		sampleRateHertz: 16000,
		threshold: 0,
		verbose: false,
		// recordProgram: 'arecord',
		recordProgram: 'rec',
		silence: '10.0',
	});
}

function generatePCM() {
	console.log('Start Mic');
	mic.on('data', (data) => {
		grpcAgent.sendVoiceData(data);
	});
	grpcAgent.setMicObj(record);
}

const mic = initMic();
mic.on('data', (data) => {
	grpcAgent.sendVoiceData(data);
});

console.log("========command========");
console.log("s: Start voice command");
console.log("c: Reconnect to Server");
console.log("d: Disonnect");
console.log("=======================");
//Process User Key Input
const stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');
stdin.on('data', (key) => {
	if (key === '\u0003') {
		process.exit();
	} else if (key === 's') {
		console.log('[INFO] USER-ACTION >>> Voice command started');
		logger.info('[INFO] USER-ACTION >>> Voice command started');
		//generatePCM();
		grpcAgent.startVOCM();
	} else if (key === 'c') {
		console.log('[INFO] USER-ACTION >>> Connect to Server');
		logger.info('[INFO] USER-ACTION >>> Connect to Server');
		grpcAgent.connectServiceM();
	} else if (key === 'd') {
		console.log('[INFO] USER-ACTION >>> Disconnect');
		logger.info('[INFO] USER-ACTION >>> Disconnect');
		grpcAgent.disconnectServiceM();
	}
});
