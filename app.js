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

module.exports = app;
