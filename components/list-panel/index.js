/*
Tencent is pleased to support the open source community by making WeChat iHearing available.

Copyright (C) 2019 THL A29 Limited, a Tencent company. All rights reserved.

Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at
http://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

Component({
    options: {
        multipleSlots: true // 在组件定义时的选项中启用多slot支持
    },
    properties: {
        content: {
            type: String,
            value: '',
        },
        score: {
            type: Number,
            value: 0,
            observer: function(newVal, oldVal, changedPath) {
                // 属性被改变时执行的函数（可选），也可以写成在methods段中定义的方法名字符串, 如：'_propertyChange'
                // 通常 newVal 就是新设置的数据， oldVal 是旧数据
                let scoreClass = ''
                if(isNaN(newVal)) {
                    return
                }
                let val = Number(newVal)
                if( val >= 90 ) {
                    scoreClass = 'score-excellent'
                } else if (val > 60) {
                    scoreClass = 'score-good'
                }
                this.setData({
                    scoreClass:scoreClass
                })
            }
        }
    },

    data: {
        editText: "",
        isFocus: false,
        scoreClass: "",
    },

    ready: function () {

    },

    // 组件生命周期函数，在组件实例被从页面节点树移除时执行
    detached: function() {

    },

    methods: {
        /**
         * 设置文字内容
         */
        setEditText: function (text) {
            this.setData({
                editText: text,
                isFocus: true
            })
        },

        /**
         * 点击取消
         */
        cancel: function() {
            this.setEditText("")
            this.triggerEvent('textchange', {
                editText: ""
            })
        },

        /**
         * bindinput
         */
        editInput: function (event) {
            // console.log("editInput")
            let editText = event.detail.value

            this.triggerEvent('textchange', {
                editText: editText
            })
        },

        /**
         * bindconfirm
         */
        editConfirm: function (event) {
            console.log("editConfirm", event)
        },

        /**
         * 点击文本输入框修改
         */
        editFocus: function(e) {

        },

        /**
         * 输入框失焦
         */
        editBlur: function() {

        },

        /**
         * 清空内容
         */
        deleteContent: function () {
            this.setEditText("")
        },

    }
});