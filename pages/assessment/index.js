/*
Tencent is pleased to support the open source community by making WeChat iHearing available.

Copyright (C) 2019 THL A29 Limited, a Tencent company. All rights reserved.

Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const app = getApp()

import { evalMode, assessmentItems,  } from '../../utils/conf.js'
import { language } from '../../utils/language.js'

const languageCN = language[0]

import { requestAppId, requestUrl } from '../../utils/conf.js'


// const plugin = require('../../utils/api/manager.js')
const plugin = requirePlugin("ihearing-eval")

// 获取**全局唯一**的语音识别管理器**recordRecoManager**
const manager = plugin.getRecordRecognitionManager()


const overallIndex = [{
                key: 'pron_accuracy',
                desc: '准确度',
        },
        {
                key: 'pron_fluency',
                desc: '流畅度',
        },
        {
                key: 'pron_completion',
                desc: '完成度',
        },
]


Page({
    data: {
        mode: 'word',
        modeDetail: evalMode.word,

        assessmentItem: {},

        index: 0,
        canPrevious: true,
        canNext: true,

        // hasResult: false,
        hasResult: true,

        buttonType: 'normal',

        // 整体结果
        overallResult: {
            "pron_accuracy": 56,
            "pron_fluency": 30,
            "pron_completion": 32,
        },

        // 整体指标
        overallIndex: overallIndex,


        // 返回结果处理后的音标数组
        phoneticArr: [
        ],

        // 返回结果处理后的单词数组
        wordArr: [],

        wordError: [], // 错误单词
        wordCaton: [], // 停顿过长
        wordMiss: [], // 遗漏词汇
        wordExtra: [], // 多读词汇


        voicePath: "",

        playType: 'wait', // 语音播放状态


    },
    streamRecord: function(e) {

        manager.start({
            content: this.data.assessmentItem.text,
            evalMode: this.data.mode,
            scoreCoeff: app.globalData.score_coeff,
            // log: "showmedetail",
        })

        wx.showLoading({
            title: '录音中',
            // mask: true,
        })


    },

    endStreamRecord: function() {
        console.log("endStreamRecord")
        manager.stop()

        wx.showLoading({
            title: '识别中',
        })


    },

    previous: function() {
        if(!this.data.canPrevious) {
            console.warn("not can previous ")
            return
        }
        this.initPage({
            mode: this.data.mode,
            index: this.data.index - 1
        })
    },
    next: function() {
        if(!this.data.canNext) {
            console.warn("not can next ")
            return
        }
        this.initPage({
            mode: this.data.mode,
            index: this.data.index + 1
        })
    },
    // 语音播放
    playVoice: function(e) {
        console.log("playVoice", e)
        let voiceId = e.currentTarget.dataset.voice

        if(!voiceId) {
            console.warn("no translate voice path")
            return
        }

        let flag = this.data.mode == 'sentence' ? 1 : 0

        let play_path = `${requestUrl}&appid=${requestAppId}&mode=get_voice&flag=${flag}&voice_id=${voiceId}`

        console.log("play_path", play_path)

        wx.onBackgroundAudioStop(res => {
            console.log("play voice end",res)
            this.playAnimationEnd()
        })

        this.playAnimationStart()


        wx.playBackgroundAudio({
            dataUrl: play_path,
            title: '',
            success: (res) => {
                console.log("play success")
                this.playAnimationStart()
            },
            fail: (res) => {
                    // fail
                    console.log("failed played", play_path);
                    this.playAnimationEnd()
            },
            complete: function (res) {
                    console.log("complete played");
            }
        })

    },

    /**
     * 开始播放
     */
    playAnimationStart: function() {
        this.setData({
            playType: 'playing',
        })

    },

    /**
     * 结束播放
     */
    playAnimationEnd: function() {
            this.setData({
                playType: 'wait',
            })
    },

    // 处理浮点数
    handleNum: function(num) {
        return Number(num).toFixed(0)
    },

    // 准确度分级
    getAccuracyType: function(accuracy) {
        let accuracyType = 'normal'
        if(accuracy > 80) {
            accuracyType = 'success'
        } else if(accuracy < 60) {
            accuracyType = 'error'
        }
        return accuracyType
    },

    // 单词模式处理音标
    handlePhoneInfo: function(result) {
        let word = result.words[0]
        let phoneArr = word.phone_info

        let phoneHandledArr = []
        for(let i = 0; i < phoneArr.length; i++) {
            let phoneItem = phoneArr[i]

            let phoneType = this.getAccuracyType(phoneItem.pron_accuracy)

            phoneHandledArr.push({
                phone: phoneItem.phone,
                type: phoneType,
            })
        }

        this.setData({
            phoneticArr: phoneHandledArr
        })
    },

    // 句子模式处理单词
    handleSentenceInfo: function(result) {
        let words = result.words || [];
        let wordLen = words.length;

        let wordArr = []
        let wordError = []
        let wordCaton = []
        let wordMiss = []
        let wordExtra = []


        let lastWordEnd = 0; // 上一个词的结束时间
        for(let i = 0; i < wordLen; i++) {
            let wordItem =  words[i];
            let tag = wordItem.tag;
            let word = wordItem.word;

            let wordObj = {}

            if(tag === 1) { // 多读
                wordExtra.push(word)
            } else if(tag === 2){ // 少读
                wordMiss.push(word)
                wordArr.push({
                    word: word,
                    type: 'error',
                })

            } else if(tag === 0) { // 匹配
                let phoneType = this.getAccuracyType(wordItem.pron_accuracy)
                if(phoneType == 'error') {
                    wordError.push(word)
                }
                let wordStart = wordItem.word_start,
                        wordEnd = wordItem.word_end

                let interval = wordStart - lastWordEnd
                if(lastWordEnd > 0 && interval > 200) { // 间隔大于200ms算卡顿
                    wordCaton.push(word)
                }

                lastWordEnd = wordEnd

                wordArr.push({
                    word: word,
                    type: phoneType,
                })
            }
        }

        this.setData({
            wordArr: wordArr,
            wordError: wordError,
            wordCaton: wordCaton,
            wordMiss: wordMiss,
            wordExtra: wordExtra,
        })
    },

    // 缓存评估结果到localstorage
    cacheResult: function(result) {
        let content = this.data.assessmentItem.text
        let mode = this.data.mode

        let contentData = {
            content: content,
            index: this.data.index,
            pron_accuracy: this.handleNum(result.pron_accuracy),
        }

        let storageData = {}

        wx.getStorage({
            key: mode,
            success: function(res) {
                    console.log("getStorage   cacheResult" ,res.data)
                    storageData = res.data
            },
            fail: function() {

            },
            complete: function() {
                console.log("getStorage complete", storageData)
                storageData[content] = contentData
                wx.setStorage({
                    key:mode,
                    data: storageData
                })
            },
        })
    },

    // 统一处理整体评估结果
    handleOverallResult: function(result) {
        this.setData({
            overallResult: {
                pron_accuracy: this.handleNum(result.pron_accuracy),
                pron_fluency: this.handleNum(result.pron_fluency),
                pron_completion: this.handleNum(result.pron_completion),
            },
        })
    },

    // 单词模式
    buildWordResult: function(result) {
        this.handleOverallResult(result)
        this.handlePhoneInfo(result)

        this.cacheResult(result)
    },

    // 句子模式
    buildSentenceResult: function(result) {
        this.handleOverallResult(result)
        this.handleSentenceInfo(result)

        this.cacheResult(result)
    },

    /**
     * 识别内容为空时的反馈
     */
    showRecordEmptyTip: function() {

        wx.showToast({
            title: languageCN.recognize_nothing,
            icon: 'success',
            image: '/images/no_voice.png',
            duration: 1000,
            success: function (res) {

            },
            fail: function (res) {
                console.log(res);
            }
        });
    },


    /**
     * 初始化语音识别回调
     * 绑定语音播放开始事件
     */
    initRecord: function() {
        // 识别结束事件
        manager.onStop = (res) => {

            console.log("out stop", res)
            let result = res.result

            if(result.words.length == 0) {
                this.showRecordEmptyTip()
                return
            }


            switch (this.data.mode) {
                case 'word':
                    this.buildWordResult(result)
                    break
                case 'sentence':
                    this.buildSentenceResult(result)
                    break
                default:
                    break
            }
            this.setData({
                hasResult: true,
            })

            wx.hideLoading()
        }

        // 识别错误事件
        manager.onError = (res) => {

            console.error("out error", res)

            setTimeout(()=>{
                wx.hideLoading()


                wx.showToast({
                    title: res.msg,
                    icon: 'none',
                    duration: 2000
                })
            }, 20)


        }
    },
    initPage: function(option) {
        console.log("initPage", option)
        let index = option.index || 0
        let modeName = option.mode || 'word'
        let modeDetail = evalMode[modeName] || {}

        let listKey = modeName == 'word' ? 'currentWordList' : 'currentSentenceList'
        let assessmentList = app.globalData[listKey]

        let assessmentItem = assessmentList[index] || {}
        if(modeName == 'word') {
            app.globalData.currentSentenceList = assessmentItem.sent_ids || []
        }


        let canPrevious = index > 0
        let canNext = index < assessmentList.length - 1

        this.setData({
            mode: modeName,
            modeDetail: modeDetail,
            assessmentItem: assessmentItem,
            index: Number(index),
            hasResult: false,
            voicePath: '',
            canPrevious: canPrevious,
            canNext: canNext,
        })

        wx.setNavigationBarTitle({
            title: `${modeDetail.desc}测评`
        })
    },

    onLoad: function (option) {
        // mode=sentence&index=10
        console.log("assessment", option)
        this.initPage(option)

        this.initRecord()

        app.getRecordAuth()

    },

    onHide: function() {
        const innerAudioContext = wx.createInnerAudioContext()

        innerAudioContext.stop()
    },

})
