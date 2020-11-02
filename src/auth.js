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

const fs = require('fs');
const request = require('sync-request');
const utils = require(__dirname + '/util.js');
const dotenv = require('dotenv');

function getAuth(params) {
    const timeStamp = utils.getTimeStamp();
    const signature = utils.createSignature(timeStamp, params);
    let opts = {
        json: {
            "client_key": params.clientKey,
            "timestamp": timeStamp,
            "signature": signature,
            "userid": params.userId,
            "devicemodel": 'nodejs',
            "ostype": '',
            "pkgname": ''
        },
        'headers': {
            "Content-Type": "application/json",
            "x-auth-clienttype": params.deviceType,
        }
    };
    let res = request('POST', process.env.AUTH_URL, opts);
    return JSON.parse(res.getBody());
};

function chkAuth(params) {
    const timeStamp = utils.getTimeStamp();
    const signature = utils.createSignature(timeStamp, params);
    var opts = {
        'headers': {
            "x-auth-clienttype": params.deviceType,
            "x-auth-timestamp": timeStamp,
            "x-auth-signature": signature,
        }
    };
    let res = request('GET', process.env.AUTH_URL + '/' + params.uuid, opts);
    return JSON.parse(res.getBody());
};

function authorize(params, fname) {
    
    let newUuid
    try {
        const parseUuid = dotenv.config({ path: fname });
        if (parseUuid.error) {
            throw parseUuid.error;
        }
        newUuid = process.env.UUID;
        params.uuid = newUuid;
        res = chkAuth(params);
        if (res.rc != 200) {
            newUuid = newUUID(params, fname);
        }
    } catch (err) {
        newUuid = newUUID(params, fname);
    }
    return newUuid;
}

function newUUID(params, fname) {
    res = getAuth(params);
    fs.writeFileSync(fname, `UUID=${res.uuid}`, function (err) {
        if (err) throw err
    });
    process.env.UUID = res.uuid;
    return res.uuid;
}

module.exports.authorize = authorize;

