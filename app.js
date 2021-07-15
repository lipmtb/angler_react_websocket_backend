var http = require('http');
let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

let loginRouter = require('./routes/login');
let userRouter=require("./routes/user")
let talkRouter=require("./routes/talk")
let tipRouter=require("./routes/tip")
let messageRouter=require("./routes/message")
let app = express();
let mongoose =require("mongoose");

//全局中间件:解决所有路由的跨域问题

// app.all('*', function (req, res, next) {
//   console.log("*****全局解决跨域app.all*****");

//   res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:3000');
//   res.header('Access-Control-Allow-Headers', 'X-Requested-With,Content-Type,Cache-Control');
//   res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,DELETE');
//   res.header('Access-Control-Allow-Credentials', true);

//   next();
// })

//mongoose连接数据库
mongoose.connect("mongodb://127.0.0.1:27001/angler", {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  function (err) {
    if (err) {
      throw err;
    }
    console.log("连接数据库成功");
  })


  

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



app.use('/', loginRouter);
app.use("/user",userRouter);//修改用户头像等
app.use("/talk",talkRouter);//钓友圈
app.use("/tip",tipRouter);//技巧
app.use("/message",messageRouter);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

let server = http.createServer(app);
server.listen(82,()=>{
  console.log("服务器在82端口启动")
});

const io=require("socket.io")(server,{ cors: true });
module.exports = {
  io,
  app
};
