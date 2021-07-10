const express = require("express");
const router = express.Router();


const {
    msgModel,
    userModel
} = require("../data/userModel")


const {
    talkEssayModel
} = require("../data/talkModel")
//新消息
router.post("/newMainMessage", (req, res) => {
    let {
        userId, //接收消息的用户
        essayId, //消息来源的帖子
        fromUserId, //发出消息的用户id
        fromUserName,
        messageContent //消息内容：xxx
    } = req.body;
    msgModel.findOne({
        userId,
        essayId
    }).exec((err, message) => {
        if (err) {
            throw err;
        }
        if (message) {
            //存在则更新，新消息内容，新消息数+1
            msgModel.updateOne({
                userId,
                essayId
            }, {
                $push: {
                    messageArr: {
                        fromUserId: fromUserId,
                        fromUserName: fromUserName,
                        messageContent: messageContent,
                        createTime: new Date()
                    }
                },
                $inc: {
                    messageCount: 1
                },
                newMessageTime: new Date()

            }).exec((err, updatedoc) => {
                if (err) {
                    res.send({
                        errCode: 1,
                        errMsg: "消息更新失败"
                    })
                    throw err;
                }
                res.send({
                    errCode: 0,
                    errMsg: '消息更新成功',
                    message: updatedoc
                })
            })
        } else {
            //不存在则新创建一条消息
            new msgModel({
                userId: userId, //接收消息的用户
                essayId: essayId, //消息来源的帖子
                messageArr: [{
                    fromUserId: fromUserId,
                    fromUserName: fromUserName,
                    messageContent: messageContent,
                    createTime: new Date()
                }], //最新消息数组：用户xxx评论了你 yyyy
                messageCount: 1, //该帖子的新消息数(未读消息)
                newMessageTime: new Date() //最新消息创建时间

            }).save((err, doc) => {
                if (err) {
                    res.send({
                        errCode: 1,
                        errMsg: "消息发布失败"
                    })
                    throw err;
                }
                res.send({
                    errCode: 0,
                    errMsg: '新消息创建成功',
                    message: doc
                })
            })
        }
    })

})

//获取用户的消息列表
router.get("/userMessage", (req, res) => {
    let {
        userId,
        skip,
        limit
    } = req.query;
    let skipNum = parseInt(skip) || 0;
    let limitNum = parseInt(limit) || 4;
    msgModel.find({
        userId: userId
    }).sort({
        newMessageTime: -1
    }).skip(skipNum).limit(limitNum).exec((err, messagelists) => {
        if (err) {
            res.send({
                errCode: 1,
                errMsg: '获取我的消息失败'
            })
            throw err;
        }
        let prosAll = [];
        for (let i = 0; i < messagelists.length; i++) {
            let messageItem = messagelists[i];
            let messageItemPromise = [];
            let essayPros = new Promise((resolve) => {
                talkEssayModel.findById(messageItem.essayId).exec((err, essay) => {
                    messageItem.essayInfo = essay;
                    resolve(essay);
                })
            })
            messageItemPromise.push(essayPros);


            if (messageItem.messageArr.length > 0) {
                for (let msgitem of messageItem.messageArr) {
                    let msgItemPromise = new Promise((resolve) => {
                        userModel.findById(msgitem.fromUserId).exec((err, userinfo) => {
                            msgitem.fromUserInfo=userinfo;
                            resolve(userinfo);
                        })
                    })
                    messageItemPromise.push(msgItemPromise);
                }
            }
            prosAll.push(Promise.all(messageItemPromise));

        }
        Promise.all(prosAll).then(() => {
            res.send({
                errCode: 0,
                errMsg: '获取我的消息成功',
                messageLists: messagelists
            })
        })


    })
})

module.exports = router;