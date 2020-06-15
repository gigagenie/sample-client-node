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

const grpc = require('grpc');
const util = require(__dirname+'/util');
const server = require(__dirname+'/../config/server.json');
const { clientInfo } = require(__dirname+'/client');

let uuid;

function grpc_channel(in_uuid) {
    uuid = in_uuid;
    sslCredential = grpc.credentials.createSsl();
    authCredential = grpc.credentials.createFromMetadataGenerator(_generateMetadata);
    credentials = grpc.credentials.combineChannelCredentials(sslCredential, authCredential);
    proto = grpc.load(__dirname+'/../lib/gigagenieM.proto').kt.gigagenie.ai.m;
    return new proto.GigagenieM(`${server.host}:${server.port}`, credentials);
}

function _generateMetadata(params, callback) {
    const metadata = new grpc.Metadata();
    const timeStamp = util.getTimeStamp();
    metadata.add('x-auth-clienttype', clientInfo.deviceType);
    metadata.add('x-auth-clientuuid', uuid);
    metadata.add('x-auth-timestamp', timeStamp);
    metadata.add('x-auth-signature', util.createSignature(timeStamp, clientInfo));
    callback(null, metadata);
};

module.exports.grpc_channel = grpc_channel;
