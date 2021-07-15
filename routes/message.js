const express = require("express");
const router = express.Router();


const {
    msgModel,
    userModel
} = require("../data/userModel")


const {
    talkEssayModel
} = require("../data/talkModel")




//新消息(主评论)
router.post("/newMainMessage", (req, res) => {

    const {
        io
    } = require("../app");
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
                userModel.findById(fromUserId).exec((err, userinfo) => {
                    //用户消息某个帖子的消息数和消息列表增加一个消息
                    io.emit(userId + "updateMsg", {
                        essayId: essayId,
                        fromUserId: fromUserId,
                        fromUserInfo: userinfo,
                        fromUserName: fromUserName,
                        messageContent: messageContent,
                        createTime: new Date()
                    });
                })
                //新消息总数增加

                io.emit(userId+"incMsg");


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
                let prosArr = [];
                let propsEssay = new Promise((resolve) => {
                    talkEssayModel.findById(doc.essayId).exec((err, essay) => {
                        doc.essayInfo = essay;
                        resolve(essay);
                    })
                })
                prosArr.push(propsEssay);

                for (let msgitem of doc.messageArr) {
                    let msgItemPromise = new Promise((resolve) => {
                        userModel.findById(msgitem.fromUserId).exec((err, userinfo) => {
                            msgitem.fromUserInfo = userinfo;
                            resolve(userinfo);
                        })
                    })
                    prosArr.push(msgItemPromise);
                }
                Promise.all(prosArr).then(() => {

                    io.emit(userId + "newMsg", doc);
                })


            })
        }
    })

})

//回复
router.post("/replyMessage", (req, res) => {

    const {
        io
    } = require("../app");
    let {
        userId, //接收消息的用户
        essayId, //消息来源的帖子
        fromUserId, //发出消息的用户id
        fromUserName,
        messageContent, //消息内容：xxx
        fromUserComment //回复的评论内容
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
                        createTime: new Date(),
                        fromUserComment: fromUserComment
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
                userModel.findById(fromUserId).exec((err, userinfo) => {
                    io.emit(userId + "updateMsg", {
                        essayId: essayId,
                        fromUserId: fromUserId,
                        fromUserInfo: userinfo,
                        fromUserName: fromUserName,
                        messageContent: messageContent,
                        createTime: new Date(),
                        fromUserComment: fromUserComment
                    });
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
                    createTime: new Date(),
                    fromUserComment: fromUserComment
                }], //最新消息数组：用户xxx回复了你 yyyy
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
                let prosArr = [];
                let propsEssay = new Promise((resolve) => {
                    talkEssayModel.findById(doc.essayId).exec((err, essay) => {
                        doc.essayInfo = essay;
                        resolve(essay);
                    })
                })
                prosArr.push(propsEssay);

                for (let msgitem of doc.messageArr) {
                    let msgItemPromise = new Promise((resolve) => {
                        userModel.findById(msgitem.fromUserId).exec((err, userinfo) => {
                            msgitem.fromUserInfo = userinfo;
                            resolve(userinfo);
                        })
                    })
                    prosArr.push(msgItemPromise);
                }
                Promise.all(prosArr).then(() => {

                    io.emit(userId + "newMsg", doc);
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
                            msgitem.fromUserInfo = userinfo;
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

//用户读取消息
router.post("/readEssayMsg", (req, res) => {

    // const {
    //     io
    // } = require("../app");
    let {
        userId, //接收消息的用户
        essayId, //消息来源的帖子
        count   //消息数量
    } = req.body;
    msgModel.updateOne({
        userId,
        essayId
    },{
        messageCount:0
    }).exec((err,updateres)=>{
        if(err){
            throw err;
        }
        res.send({
            errMsg:"读取消息成功",
            errCode:0,
            data:updateres
        })
        // io.emit(userId+"readedMsg",count);
    })
})



//获取总消息总数
router.get("/allMsgCount/:userId",(req,res)=>{
    let userId=req.params.userId;
    msgModel.find({
        userId:userId
    }).exec((err,lists)=>{
        if(err){
            throw err;
        }
        let sum=0;
        for(let essayMsg of lists){
            sum+=essayMsg.messageCount;
        }
        res.send({
            errCode:0,
            errMsg:"获取总消息数成功",
            total:sum
        })

    })
})

module.exports = router;