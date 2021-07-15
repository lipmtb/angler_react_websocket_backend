const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;
//用户
const userModel = mongoose.model("user", new mongoose.Schema({
    userName: String,
    userPsw: String,
    avatarUrl:String,
    avatarRadX:Number,
    avatarRadY:Number
}), "user");




/**
 * messageArr：[{
 *  userInfo:Object,
 * messageContent:String（评论）
 * }]
 */
//消息
const msgModel=mongoose.model("message",new mongoose.Schema({
    userId:String,//接收消息的用户
    essayId:String,//消息来源的帖子
    essayInfo:Object,//帖子详细信息，帖子title，帖子的发布者等
    messageArr:[{
        fromUserId:String,
        fromUserName:String,
        messageContent:String,
        fromUserInfo:Object,
        createTime:Date,
        fromUserComment:String
    }],//最新消息数组：用户xxx评论了你 yyyy
    messageCount:Number,//该帖子的新消息数(未读消息)
    newMessageTime:Date   //最新消息创建时间
   
}),"message")


module.exports={
    userModel,
    msgModel

}