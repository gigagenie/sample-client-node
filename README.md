# Sample Client Nodejs
본 프로젝트는 GiGA Genie Inside(이하, G-INSIDE) API의 규격(grpc, REST)에 맞추어 개발된 
Node.js 샘플 클라이언트입니다.


## GiGA Genie Inside
GiGA Genie Inside(이하, G-INSIDE)는 3rd party 개발자가 자신들의 제품(단말 장치, 서비스, 앱 등)에 KT의 AI Platform인 
'기가지니'를 올려서 음성인식과 자연어로 제어하고 기가지니가 제공하는 서비스(생활비서, 뮤직, 라디오 등)를 사용할 수 있도록 해줍니다.
G-INSIDE는 기가지니가 탑재된 제품을 개발자들이 쉽게 만들 수 있도록 개발 도구와 문서, 샘플 소스 등 개발에 필요한 리소스를 제공합니다.


## Sample client Nodejs 개요

Sample Client에 구현되어있는 기능은 다음과 같습니다.
* 디바이스 키 인증
* 음성/Text를 이용한 대화
    * 마이크(mic) 제어
    * ServiceM RPC command 일부 지원
      
        >해당 command는 Cloud AI Platform에서 제공하는 API로 G-API 스펙은 별도 공간을 통해 오픈 예정입니다.

다른 언어의 샘플은 https://github.com/gigagenie 에서 확인할 수 있습니다.


## 배포 패키지 구성

* README.md: this file
* package.json: 본 프로젝트 정보와 의존성(dependencies)을 관리하는 문서
* config/: 본 프로젝트 실행을 위한 서버와 클라이언트 키 정보
  - .env.dev: 인증 서버 및 gRPC 서버 정보
  - .env.dev.client: 본 프로젝트 실행을 위한 키 정보(**발급받은 키 정보로 수정 필요**)
  - .env.dev.uuid: 인증된 단말의 UUID 정보(**최초 인증 시 생성**)
* lib/: gRPC 연결을 위한 정보
  - gigagenieM.proto: gRPC proto 파일
* **startAgent.js**: 본 배포판을 실행하는 메인 파일으로, src/ 내부의 파일을 호출
* src/: Client 구현을 위해 필요한 라이브러리 및 모듈
  - auth.js: UUID 등록 및 확인 모듈
  - client.js: Client 정보 파일 로드 모듈
  - grpc_channel.js: grpc 채널 연결 기능 모듈
  - mediaPlayer.js: Vlc를 이용한 출력 player 모듈
  - util.js: timestamp, signature 생성 모듈
  - **agentClient.js**: ServiceM RPC command 별 기능 구현 모듈

# Prerequisites

## 인사이드 디바이스 키 발급
1. API Link(https://apilink.kt.co.kr) 에서 회원가입 
2. 사업 제휴 신청 및 디바이스 등록 (Console > GiGA Genie > 인사이드 디바이스 등록)
3. 디바이스 등록 완료 후 My Device에서 등록한 디바이스 정보 및 개발키 발급 확인 (Console > GiGA Genie > My Device)
4. 발급된 개발키를 agent.config 파일에 등록하여 개발 서버 연동 및 테스트


## 개발 환경

* OS: Ubuntu, macOS X 지원
* Node.js 10.x ~ 지원

## Ubuntu 환경 설정

### sox 설치

```shell
$ sudo apt install sox
```

### VLC 설치

```shell
$ sudo apt install vlc-nox
```

## macOS 환경 설정

### sox 설치

```shell
$ brew install sox
```

### VLC 설치 및 설정
vlc 프로그램 설치 후 진행합니다.
https://www.videolan.org/index.ko.html

* command 환경에서 vlc 실행을 위한 스크립트
```shell
$ cat /Users/{Your_path}/cvlc
#! /bin/sh

exec /Applications/VLC.app/Contents/MacOS/VLC -I "dummy" "$@"
```

* 스크립스 실행을 위한 환경변수 설정 및 적용
```shell
$ cat ~/.zshrc
export CVLC_HOME=/Users/exec
export PATH=${PATH}:$CVLC_HOME/cvlc

$ source ~/.zshrc
```


-------


# Quick Start

## 1. 의존성 패키지 설치

    $ npm install

## 2. 클라이언트 키 정보 설정
발급받은 인사이드 디바이스 키 정보를 입력 

    $ vi config/.env.dev.client
        
    CLIENT_TYPE=GINSIDE
    CLIENT_ID=YOUR_CLIENT_ID
    CLIENT_KEY=YOUR_CLIENT_KEY
    CLIENT_SECRET=YOUR_CLIENT_SECRET
    

## 4. 실행 !!!
    $ npm run start

또는

    $ node startAgent.js



## 5. 로그 확인
    - src/logger.js 설정을 통해 로그 출력 위치를 변경 할 수 있습니다.

    $ tail -f run.log


# License

sample-client-node is licensed under the [Apache License 2.0](http://www.apache.org/licenses/LICENSE-2.0)
