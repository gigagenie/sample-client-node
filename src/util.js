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

const dateFormat = require('dateformat');
const crypto = require('crypto');
const grpc = require('grpc');

function getTimeStamp() {
    return dateFormat(new Date(), 'yyyymmddHHmmssL');
};

function createSignature(timestamp, params) {
    return crypto.createHmac('sha256', params.clientSecret).update(params.clientId + ':' + params.clientKey + ':' + timestamp).digest('hex');
};

module.exports.getTimeStamp = getTimeStamp;
module.exports.createSignature = createSignature;
