const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const fs = require("fs");
const router = express.Router();
const multiparty = require("multiparty");
const {
    talkEssayModel,
    commentTalkModel
} = require("../data/talkModel")
const {
    userModel
} = require("../data/userModel")

//发布帖子
router.post("/addNewTalk", (req, res) => {
    let form = new multiparty.Form();

    form.parse(req, function (err, fields, files) {
        console.log("解析到基本数据", fields);
        console.log("解析到file数据", files);


        let fileLists = files.fileLists;
        let prosAll = [];
        if (fileLists && fileLists.length > 0) {
            for (let fileobj of fileLists) {
                console.log("正在读取文件:", fileobj.originalFilename);
                let newName = String(Date.now()).substr(6) + fileobj.originalFilename;
                let newPath = path.join(__dirname, "../public/images/talk", newName);

                let ws = fs.createWriteStream(newPath);
                let rs = fs.createReadStream(fileobj.path);
                rs.pipe(ws);
                let pros = new Promise((resolve) => {
                    ws.on("close", function () {
                        resolve(newName);
                    })
                })
                prosAll.push(pros);
            }
        }

        Promise.all(prosAll).then((newImgArr) => {
            new talkEssayModel({
                anglerId: fields.userid[0], //发布者Id
                anglerName: fields.username[0], //发布者名字
                title: fields.title[0],
                content: fields.content[0],
                imgArr: newImgArr,
                publishTime: new Date(),
            }).save((err2,doc)=>{
                if(err2){

                    res.send({
                        errCode:1,
                        errMsg:"发布失败"
                    })
                    throw err2;
                }
                res.send({
                    errCode:0,
                    errMsg:"发布成功",
                    newEssay:doc
                })
            })
        })
    })
})

//获取热门帖子 get: /talk/hoTalk?skip=0&limit=4
router.get("/hotTalk", (req, res) => {
    let skipTalk = req.query.skip;
    console.log("跳过skip:", skipTalk);
    let limitTalk = req.query.limit || 4;
    skipTalk = parseInt(skipTalk);
    limitTalk = parseInt(limitTalk);
    let prosAll = [];
    commentTalkModel.aggregate([{
        "$group": {
            "_id": "$commentTalkId",
            "count": {
                "$sum": 1
            }
        }
    }, {
        $sort: {
            count: -1,
            _id: 1
        }
    }, {
        $skip: skipTalk
    }, {
        $limit: limitTalk
    }]).then((commentRes) => {
        console.log("热门talk分组返回", commentRes);
        for (let it of commentRes) {
            let pros = new Promise((resolve) => {
                talkEssayModel.findById(it._id).exec((err, data) => {
                    if (err) {

                        throw err;
                    }
                    resolve(data)
                })
            })
            prosAll.push(pros);
        }
        Promise.all(prosAll).then((datalists) => {
            let userprops = [];
            for (let listitem of datalists) {
                let pros = new Promise((resolve) => {
                    userModel.findById(listitem.anglerId, {
                        __v: 0,
                        userPsw: 0
                    }).exec((err, userdata) => {
                        listitem.userInfo = userdata;
                        resolve(userdata);
                    })
                })
                userprops.push(pros);
            }
            Promise.all(userprops).then(() => {

                res.send(datalists);
            })
        })


    })


})

//获取所有帖子
router.get("/allTalk", (req, res) => {
    let skipTalk = req.query.skip;
    console.log("跳过skip:", skipTalk);
    let limitTalk = req.query.limit || 4;
    skipTalk = parseInt(skipTalk);
    limitTalk = parseInt(limitTalk);


    talkEssayModel.find({}).skip(skipTalk).limit(limitTalk).exec((err, datalists) => {

        let userprops = [];
        for (let listitem of datalists) {
            let pros = new Promise((resolve) => {
                userModel.findById(listitem.anglerId, {
                    __v: 0,
                    userPsw: 0
                }).exec((err, userdata) => {
                    listitem.userInfo = userdata;
                    resolve(userdata);
                })
            })
            userprops.push(pros);
        }
        Promise.all(userprops).then(() => {

            res.send(datalists);
        })

    })

})

//获取最新帖子
router.get("/allNewTalk", (req, res) => {
    let skipTalk = req.query.skip;
    
    let limitTalk = req.query.limit || 4;
    skipTalk = parseInt(skipTalk);
    limitTalk = parseInt(limitTalk);


    talkEssayModel.find({}).sort({
        publishTime:-1,
        _id:1
    }).skip(skipTalk).limit(limitTalk).exec((err, datalists) => {

        let userprops = [];
        for (let listitem of datalists) {
            let pros = new Promise((resolve) => {
                userModel.findById(listitem.anglerId, {
                    __v: 0,
                    userPsw: 0
                }).exec((err, userdata) => {
                    listitem.userInfo = userdata;
                    resolve(userdata);
                })
            })
            userprops.push(pros);
        }
        Promise.all(userprops).then(() => {

            res.send(datalists);
        })

    })

})


//主评论帖子
router.post("/commentTalk", function (req, res) {


    let form = new multiparty.Form();

    form.parse(req, function (err, fields, files) {
        console.log("解析文件", files);
        console.log("解析其他数据", fields);
        let fileLists = files.commentFiles;
        let prosAll = [];

        //先上传评论的图片
        if (fileLists && fileLists.length > 0) {
            for (let fileobj of fileLists) {
                console.log("正在读取文件:", fileobj.originalFilename);
                let newName = String(Date.now()).substr(6) + fileobj.originalFilename;
                let newPath = path.join(__dirname, "../public/images/commentTalk", newName);

                let ws = fs.createWriteStream(newPath);
                let rs = fs.createReadStream(fileobj.path);
                rs.pipe(ws);
                let pros = new Promise((resolve) => {
                    ws.on("close", function () {
                        resolve(newName);
                    })
                })
                prosAll.push(pros);
            }
        }

        Promise.all(prosAll).then((imgArr) => {
            let commentAnglerName = fields.anglerName[0];
            let commentTalkId = fields.commentTalkId[0];
            let commentText = fields.commentText[0];
            let newComment = new commentTalkModel();
            newComment.anglerName = commentAnglerName
            newComment.commentTalkId = commentTalkId;
            newComment.commentText = commentText;
            newComment.commentTime = new Date();
            newComment.imgArr = imgArr;
            newComment.replyLists = [];
            newComment.save((err, da) => {
                if (err) {
                    res.send({
                        errCode: 1,
                        errMsg: '评论失败'
                    })
                    throw err;
                }

                res.send({
                    errCode: 0,
                    errMsg: "评论成功",
                    commentItem: da
                })
            })
        })
    })




})

//获取某个帖子的评论 get :/getTalkComment?talkId=xxx&skip=0&limit=4
router.get("/getTalkComment", (req, res) => {
    let talkId = req.query.talkId;
    let skip = req.query.skip || 0;
    let limit = req.query.limit || 4;
    skip = parseInt(skip);
    limit = parseInt(limit);
    commentTalkModel.aggregate([{
            $match: {
                commentTalkId: talkId
            }
        },
        {
            $lookup: {
                from: "user",
                localField: 'anglerName',
                foreignField: 'userName',
                as: "userArr"
            }
        }, {
            $project: {
                anglerName: "$anglerName",
                commentTalkId: "$commentTalkId",
                commentText: "$commentText",
                commentTime: "$commentTime",
                imgArr: "$imgArr",
                userInfo: {
                    $arrayElemAt: ["$userArr", 0]
                },
                replyLists: "$replyLists"
            }
        }, {
            $sort: {
                commentTime: -1,
                _id: 1
            }
        }, {
            $skip: skip
        }, {
            $limit: limit
        }
    ]).exec((err, lists) => {
        if (err) {
            throw err;
        }


        let allProps = [];
        for (let commItem of lists) {
            let prosTempAll = [];
            if (commItem.replyLists && commItem.replyLists.length > 0) {
                for (let replyitem of commItem.replyLists) {

                    let prosTwo = new Promise((resolve) => {
                        userModel.findOne({
                            userName: replyitem.fromUserName
                        }, {
                            __v: 0,
                            userPsw: 0
                        }).exec((err, fromuser) => {
                            replyitem.fromUserInfo = fromuser;
                            console.log("********get from userinfo*******");
                            userModel.findOne({
                                userName: replyitem.toUserName
                            }, {
                                __v: 0,
                                userPsw: 0
                            }).exec((err, touser) => {
                                replyitem.toUserInfo = touser;
                                resolve(touser);
                            })
                        })
                    })
                    prosTempAll.push(prosTwo);
                }

            }
            allProps.push(Promise.all(prosTempAll));


        }

        Promise.all(allProps).then(() => {
            res.send(lists);
        })


    })
})


/**
 * 回复某个评论 mainCommentId回复的评论_id,
 * 回复者姓名，
 * 回复目标姓名，
 * 回复的信息
 * 
 */
router.post("/replyComment", (req, res) => {
    let {
        mainCommentId,
        fromUserName,
        toUserName,
        commentText
    } = req.body;

    console.log("获取回复信息", mainCommentId, fromUserName, toUserName, commentText);

    let objId = mongoose.Types.ObjectId(mainCommentId)
    commentTalkModel.updateOne({
        _id: objId
    }, {
        $push: {
            replyLists: {
                fromUserName: fromUserName, //回复者姓名
                toUserName: toUserName, //回复对象的姓名
                mainCommentId: mainCommentId, //回复的主评论_id
                commentText: commentText,
                commentTime: new Date(),
            }
        }
    }).exec((err, da) => {
        if (err) {
            res.send({
                errCode: 1,
                errMsg: "回复失败"
            })
            throw err;
        }
        res.send({
            errCode: 0,
            errMsg: "回复成功",
            replyRes: da
        })
    })

})


//获取某个帖子的总评论数
router.get("/essayCommentCount", (req, res) => {
    let talkId = req.query.talkId;
    let totalCount = 0;
    commentTalkModel.find({
        commentTalkId: talkId
    }).exec((err, commlists) => {
        totalCount += commlists.length;
        for (let comm of commlists) {
            if (comm.replyLists && comm.replyLists.length > 0) {

                totalCount += comm.replyLists.length;
            }

        }
        res.send({
            errCode: 0,
            errMsg: "获取帖子评论数success",
            total: totalCount
        })
    })

})



//统计帖子总数
router.get("/totalTalk", (req, res) => {
    talkEssayModel.countDocuments({}).then((total) => {
        res.send({
            errCode: 0,
            errMsg: '钓友圈帖子数',
            total: total
        })
    })
})


//获取我发布的帖子(钓友圈部分)
router.get("/myTalkSend",(req,res)=>{
    let userId=req.query.userId;
    let skipNum=req.query.skip||0;
    let limitNum=req.query.limit||4;
    skipNum=parseInt(skipNum);
    limitNum=parseInt(limitNum);
    talkEssayModel.find({
        anglerId:userId
    }).sort({
        publishTime:-1,
        _id:1
    }).skip(skipNum).limit(limitNum).exec((err,docs)=>{
        if(err){
            res.send({
                errCode:1,
                errMsg:"获取发布的钓友圈失败"

            })
            throw err;
        }
        res.send({
            errCode:0,
            errMsg:"获取我发布的钓友圈成功",
            sendTalk:docs
        })
    })

})


//根据talkId获取某个帖子
router.get("/talkEssayDetail/:talkId",(req,res)=>{
    let talkId=req.params.talkId;
    talkEssayModel.findById(talkId).then((talkdata)=>{
        userModel.findById(talkdata.anglerId,{__v:0,userPsw:0}).exec((err1,userinfo)=>{
            if(err1){
                throw err1;
            }
            talkdata.userInfo=userinfo;
            res.send({
                errCode:0,
                errMsg:'获取帖子详情成功',
                talkdata:talkdata
            })
        })
        
    }).catch((err)=>{
        if(err){
            throw err;
        }
    })

})
module.exports = router;