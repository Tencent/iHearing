/*
Tencent is pleased to support the open source community by making WeChat iHearing available.

Copyright (C) 2019 THL A29 Limited, a Tencent company. All rights reserved.

Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

const app = getApp()

import { evalMode } from '../../utils/conf.js'
import { gradeMap, requestAppId, requestUrl } from '../../utils/conf.js'

import mockWord from '../../utils/mock_word.js'

const onePageLen = 10; // 一次setData最多set的条目数量

Page({
    data: {
        mode: 'word',
        modeDetail: evalMode.word,

        itemList: [],

        grade: {
            text: '一年级',
        },
        unit: 1,

    },


    // 得到缓存分数信息
    getAssessmentCache: function(modeName) {
        let assessmentCache = {};
        try {
            assessmentCache = wx.getStorageSync(modeName) || {}
        } catch (e) {
            console.warn(e)
            assessmentCache = {}
        }
        return assessmentCache
    },

    /**
     * 追加列表展示项目
     *
     * @param      {<type>}  modeName  The mode name
     */
    setAssessmentList: function(modeName, assessmentList) {
        let assessmentCache = this.getAssessmentCache(modeName)

        let assessmentLen = assessmentList.length

        // let currentPage = this.data.currentPage
        let itemList = this.data.itemList,
                currentListLen = itemList.length;

        let start = currentListLen


        // console.log("setAssessmentList", currentListLen, start)

        // 已经到底部了
        if(start >= assessmentLen) {
            this.setData({
                isEnd: true,
            })
            // console.warn("is END", start, assessmentLen)
            return
        }

        let dataSetted = {};
        let scoreSetted = {}; // 设置分数缓存

        let isEnd = assessmentLen == 0;
        for(let i = 0; i < assessmentLen; i++) {
            let index = start + i;

            let item = assessmentList[index]
            let content = item.text;
            let score = 0

            if(!item.index) {
                item.index = index
            }
            if(assessmentCache[content]) {
                let assItem = assessmentCache[content]
                score = assItem.pron_accuracy
            }

            let setDataKey = "itemList[" + (index) + "]";

            dataSetted[setDataKey] = {
                content: content,
                score: score
            };

            scoreSetted[index] = score
        }

        dataSetted['isEnd'] = isEnd

        // console.log("dataSetted", dataSetted)

        this.setData(dataSetted)
        // 开始处理单元平均分
        // console.log("setAssessmentList", scoreSetted)
        this.setUnitScoreCache(scoreSetted)

    },

    // 得到单元单词
    getWords(offset=0) {
        let data = mockWord

        let modeName = this.data.mode
        let word_list = data.word_list
        // 数据放global
        app.globalData.currentWordList = word_list
        let wordJson = {}
        word_list.forEach(word => {
            let text = word.text
            wordJson[text] = word
        })
        app.globalData.wordInfo = Object.assign(app.globalData.wordInfo, wordJson)
        // ---
        // console.log("word_list", word_list)

        this.setAssessmentList(modeName, word_list)
    },

    setUnitScoreCache: function(scoreSetted) {
        // console.log("scoreSetted", scoreSetted)
        let grade =  this.data.grade.grade,
                unit = this.data.unit

        let gradeUnit = `grade_${grade}_unit_${unit}`

        let gradeUnitCache = [];

        try {
            let gradeUnitObj = wx.getStorageSync(gradeUnit) || {}
            gradeUnitCache = gradeUnitObj.cache || []
        } catch (e) {
            console.warn(e)
            gradeUnitCache = []
        }
        // 更新缓存分数
        for(let index in scoreSetted) {
            let _index = parseInt(index)
            let score = scoreSetted[index]
            gradeUnitCache[_index] = score
        }
        // 算平均分
        let score = 0
        let realLen = 0; // 真正有分数的，默认0为没有分数
        gradeUnitCache.forEach( item => {
            // console.log("gradeUnitCache", item)

            if(!isNaN(item)) {
                let itemScore = parseInt(item)
                score += itemScore
                realLen = itemScore > 0 ? realLen + 1 : realLen;
            }

        } )
        // let len = gradeUnitCache.length
        // let averageScore = len == 0 ? 0 : Math.round(score / len)
        let averageScore = realLen == 0 ? 0 : Math.round(score / realLen)

        wx.setStorage({
            key:gradeUnit,
            data: {
                cache: gradeUnitCache,
                averageScore: averageScore,
            },
            fail: res => {
                console.warn(res)
            },
            success: res => {
                // console.log("success", res, gradeUnitCache, averageScore)
            }
        })
    },

    // 展示缓存分数
    showAssessmentCache: function() {
        // 处理缓存分数
        let modeName = this.data.mode
        let assessmentCache = this.getAssessmentCache(modeName)
        let itemList = this.data.itemList

        let dataSetted = {}

        let scoreSetted = {}; // 设置分数缓存

        // console.log("assessmentCache", assessmentCache)

        for(let content in assessmentCache) {
            let assItem = assessmentCache[content]
            let score = assItem.pron_accuracy
            let index = assItem.index

            let item = itemList[index]
            if(item == undefined) {
                continue
            }
            if(item.content !== content) {
                continue;
            }
            item.score = score

            let setDataKey = "itemList[" + (index) + "]";

            dataSetted[setDataKey] = item;

            scoreSetted[index] = score


        }
        this.setData(dataSetted)

        // 开始处理单元平均分
        this.setUnitScoreCache(scoreSetted)
    },


    onShow: function() {
        // console.log("list onshow")
        this.showAssessmentCache()
    },


    onLoad: function () {

        this.setData({
            grade: {
                text: '一年级',
                grade: 1,
            },
            unit: 1,
        })

        this.getWords()

        let modeName =  'word'
        let modeDetail = evalMode[modeName] || {}

        this.setData({
            mode: modeName,
            modeDetail: modeDetail,
        })

        wx.setNavigationBarTitle({
            title: `${modeDetail.desc}列表`
        })

    },

})
