const express = require("express");
const router = express.Router();
const multiparty = require("multiparty");
const fs = require("fs");
const path = require("path");
const mongoose=require("mongoose");
const {
    userModel
} = require("../data/userModel")


//更新头像
router.post("/newavatar", (req, res) => {
    let form = new multiparty.Form();

    form.parse(req, function (err, fields, files) {
        if (err) {
            console.log("解析新头像数据失败", err);
            throw err;
        }
        console.log("解析文件", files);
        console.log("解析其他数据", fields);

        let fileLists = files.avatarSrc;
        let prosAll = [];
        for (let fileobj of fileLists) {
            console.log("正在读取文件:", fileobj.originalFilename);
            let newName=String(Date.now()).substr(6) + fileobj.originalFilename;
            let newPath = path.join(__dirname, "../public/images/avatar", newName);

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

        Promise.all(prosAll).then((resarr) => {
            console.log("成功上传了新头像：" + resarr);
            let anglerId = fields.userid[0];
            let radX = parseFloat(fields.radX[0]);
            let radY = parseFloat(fields.radY[0]);
            anglerId=mongoose.Types.ObjectId(anglerId);
            userModel.findById(anglerId).exec((err,doc)=>{
                if(doc.avatarUrl){
                    let originPath = path.join(__dirname, "../public/images/avatar", doc.avatarUrl);
                    fs.unlink(originPath,(err)=>{
                        if (err) {
                            console.log('删除旧头像失败:' + newPath);
                            throw err;
                        }
                        userModel.updateOne({
                            _id: anglerId
                        }, {
                            avatarRadX: radX,
                            avatarRadY: radY,
                            avatarUrl: resarr[0]
                        }, function (err) {
                            if (err) {
                                res.send({
                                    errCode: 1,
                                    errMsg: '更新失败'
                                })
                                throw err;
                            } else {
            
                                res.send({
                                    errCode: 0,
                                    errMsg: "更新头像成功",
                                    avatar: {
                                        avatarRadX: radX,
                                        avatarRadY: radY,
                                        avatarUrl: resarr[0]
                                    }
                                });
            
                            }
                        })
                    })
                }else{
                    userModel.updateOne({
                        _id: anglerId
                    }, {
                        avatarRadX: radX,
                        avatarRadY: radY,
                        avatarUrl: resarr[0]
                    }, function (err) {
                        if (err) {
                            res.send({
                                errCode: 1,
                                errMsg: '更新失败'
                            })
                            throw err;
                        } else {
        
                            res.send({
                                errCode: 0,
                                errMsg: "更新头像成功",
                                avatar: {
                                    avatarRadX: radX,
                                    avatarRadY: radY,
                                    avatarUrl: resarr[0]
                                }
                            });
        
                        }
                    })
                }
            })
           
        })

    })
})

module.exports = router;