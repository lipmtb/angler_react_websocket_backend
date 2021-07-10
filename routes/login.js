const express = require('express');
const router = express.Router();
const md5 = require("blueimp-md5");
const {
  userModel
} = require("../data/userModel")
//登录
router.post('/login', function (req, res) {
  let {
    userName,
    password
  } = req.body;
  userModel.findOne({
    userName: userName,
    userPsw: md5(password)
  }, {
    userPsw: 0,
    __v: 0
  }).exec((err, userdoc) => {
    if (err) {
      res.send({
        errCode: 1,
        errMsg: '登录失败',
      })
      throw err;
    }
    console.log("数据库返回结果", userdoc);
    if (userdoc) {
      res.cookie("userid", userdoc._id, {
        maxAge: 30 * 60 * 1000
      });
      res.cookie("username", userName, {
        maxAge: 30 * 60 * 1000
      });
      res.send({
        errCode: 0,
        errMsg: '登录成功',
        userinfo: userdoc
      })
    } else {
      res.send({
        errCode: 1,
        errMsg: '用户名或者密码错误'
      })
    }
  })
});

//注册
router.post("/regist", function (req, res) {
  let {
    userName,
    password
  } = req.body;
  console.log("注册的用户信息", userName, password);
  userModel.findOne({
    userName
  }).exec((err, user) => {
    //判断用户名是否存在
    if (user) {
      console.log("注册失败,用户名重复");
      res.send({
        errCode: 1,
        errMsg: '用户名重复'
      })
      return;
    }

    //用户可以注册了
    new userModel({
      userName,
      userPsw: md5(password)
    }).save((err, doc) => {

      res.cookie("userid", doc._id, {
        maxAge: 5 * 60 * 1000
      })
      res.cookie("username", userName, {
        maxAge: 5 * 60 * 1000
      })
      res.send({
        errCode: 0,
        errMsg: '注册成功',
        userinfo: {
          userName: userName,
          _id: doc._id
        }
      })

    })

  })

})


//判断是否登录
router.get("/islogin", (req, res) => {
  console.log("是否登录cookies", req.cookies);
  let {
    userid
  } = req.cookies;
  if (userid) {
    userModel.findById(userid, {
      userPsw: 0,
      __v: 0
    }).exec((err, doc) => {
      res.send({
        errCode: 0,
        errMsg: '已经登录',
        userinfo: doc
      })
    })

  } else {
    res.send({
      errCode: 1,
      errMsg: '未登录',
      userinfo: null
    })
  }

})
module.exports = router;