const express = require("express");
const multiparty = require("multiparty");
const path = require("path");

const fs = require("fs");
const router = express.Router();

const {
    tipClassModel,
    tipEssayModel
} = require("../data/tipModel");
const {
    userModel
} = require("../data/userModel")


//获取所有的技巧类型
router.get("/tipClassify", (req, res) => {
    tipClassModel.find({}).sort({
        _id: 1
    }).then((lists) => {

        res.send({
            errCode: 0,
            errMsg: "获取所有的技巧类型",
            classifyLists: lists
        })
    }).catch((err) => {
        res.send({
            errCode: 1,
            errMsg: "获取技巧类型失败"
        })
        throw err;
    })
})


//根据className获取某个技巧类型的帖子列表
router.get("/getTipByClassName", (req, res) => {
    let tName = req.query.tipType;
    let skipNum = req.query.skipNum;
    skipNum = parseInt(skipNum);
    // console.log("skip",skipNum,'tname',tName);
    tipEssayModel.find({
        tipType: tName
    }).sort({
        _id: 1
    }).skip(skipNum).limit(4).then(tipdata => {
        res.send(tipdata);
        // console.log("根据类型className获取列表页:",tipdata);
    }).catch((err) => {
        res.send({
            errMsg: 1
        });
        console.log("获取某个技巧类型列表失败", err);
    })

})


//获取所有技巧类型的帖子列表(技巧类型和对应的几篇帖子)
/**
 * [{
 *  className:'钓杆',
 * essayCount:,
 * tipLists:[...]
 * }]
 */
router.get('/tipClassSomeEssays', (req, res) => {

    tipClassModel.aggregate([{
        $lookup: {
            from: 'tipEssays',
            localField: 'className',
            foreignField: 'tipType',
            as: 'tipLists'
        }
    }, {
        $sort: {
            _id: 1
        }
    }]).then((tipClassDatas) => {
        let allProps = [];
        for (let tipclass of tipClassDatas) {
            let prosTempAll = [];
            if (tipclass.tipLists && tipclass.tipLists.length > 0) {
                for (let tipitem of tipclass.tipLists) {

                    let prosTwo = new Promise((resolve) => {
                        userModel.findOne({
                            userName: tipitem.anglerName
                        }, {
                            __v: 0,
                            userPsw: 0
                        }).exec((err, fromuser) => {
                            tipitem.userInfo = fromuser;
                            resolve(fromuser);

                        })
                    })
                    prosTempAll.push(prosTwo);
                }

            }
            allProps.push(Promise.all(prosTempAll));


        }
        Promise.all(allProps).then(() => {
            res.send({
                errCode: 0,
                errMsg: '获取所有技巧类型和帖子列表',
                tipLists: tipClassDatas
            });
        })

    }).catch((err) => {
        res.send({
            errCode: 1,
            errMsg: "获取所有技巧类型失败"
        })
        throw err;
    })

})

//搜索技巧
router.get("/searchTipByKey", (req, res) => {
    let keywords = req.query.keystr;
    tipEssayModel.find({
        $or: [{
            anglerName: new RegExp(keywords, 'i')
        }, {
            title: {
                "$regex": keywords,
                "$options": 'i'
            }
        }, {
            content: {
                "$regex": keywords,
                "$options": 'i'
            }
        }]
    }).exec((err, datalists) => {
        if (err) {
            res.send({
                errMsg: 1
            })
            throw err;

        }

        res.send(datalists);
    })
})

//根据tipId获取谋篇帖子详情
router.get("/tipEssayDetail", (req, res) => {

    let tipId = req.query.tipId;
    tipEssayModel.findById(tipId).exec((err, essay) => {
        if (err) {
            res.send({
                errCode: 1,
                errMsg: "获取tip帖子详情失败"

            });
            throw err;
        }

        new Promise((resolve) => {
            userModel.findById(essay.anglerId).then((user) => {
                essay.userInfo = user;
                resolve(user);
            })
        }).then(() => {
            res.send({
                errCode: 0,
                errMsg: "获取tip帖子详情成功",
                essay: essay
            });
        })

    })

})


//发布帖子
router.post("/addNewTip", (req, res) => {
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
                let newPath = path.join(__dirname, "../public/images/tip", newName);

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
            new tipEssayModel({
                anglerId: fields.userid[0], //发布者Id
                anglerName: fields.username[0], //发布者名字
                title: fields.title[0],
                content: fields.content[0],
                tipType:fields.tipType[0],
                imgArr: newImgArr,
                publishTime: new Date()
            }).save((err2,doc)=>{
                if(err2){

                    res.send({
                        errCode:1,
                        errMsg:"发布技巧失败"
                    })
                    throw err2;
                }
                tipClassModel.updateOne({
                    className:doc.tipType
                },{
                    $inc:{
                        essayCount:1
                    }
                }).then((updateRes)=>{
                    console.log("更新"+doc.tipType+"数量成功",updateRes);
                }).catch((err)=>{
                    console.log("更新essayCount失败",err);
                })
                res.send({
                    errCode:0,
                    errMsg:"发布技巧成功",
                    newEssay:doc
                })
            })
        })
    })
})



//获取我发布的帖子(技巧部分)
router.get("/mySendTip",(req,res)=>{
    let userId=req.query.userId;
    let skipNum=req.query.skip||0;
    let limitNum=req.query.limit||4;
    skipNum=parseInt(skipNum);
    limitNum=parseInt(limitNum);
    tipEssayModel.find({
        anglerId:userId
    }).sort({
        publishTime:-1,
        _id:1
    }).skip(skipNum).limit(limitNum).exec((err,docs)=>{
        if(err){
            res.send({
                errCode:1,
                errMsg:"获取发布的技巧失败"

            })
            throw err;
        }
        res.send({
            errCode:0,
            errMsg:"获取发布的技巧成功",
            sendTip:docs
        })
    })

})

module.exports = router;