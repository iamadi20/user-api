const express=require('express');
const mongoose=require('mongoose');
const bodyparser=require('body-parser');
const cookieparser=require('cookie-parser');
const db=require('./config/config').get(process.env.NODE_ENV);
const  User=require('./models/user');
const {auth}=require('./middlewares/auth');

const port=process.env.PORT ||3000;
const server=express();
server.use(bodyparser.urlencoded({extended:false}));
server.use(bodyparser.json());
server.use(cookieparser());

mongoose.Promise=global.Promise;
mongoose.connect(db.DATABASE,{useNewUrlParser:true,useUnifiedTopology:true},function(err)
{
    if(err)
    console.log(err);
    console.log('Database connected');
});



server.get('/',(req,res)=>{
    res.status(200).send('Login API!!');
});

server.post('/api/register',function(req,res)
{
    const newUser=new User(req.body);

    User.findOne({email:newUser.email},function(err,user){
        if(user)return res.status(400).json(
            {
                auth:false,message:"Already Signed Up!!"
            }
        );

        newUser.save((err,doc)=>{
            if(err){console.log(err);
            return res.status(400).json({success:false});}
            res.status(200).json({
                success:true,
                user:doc
            });
        });
    });
});

server.post('/api/login',function(req,res)
{
    let token=req.cookies.auth;
    User.findByToken(token,(err,user)=>{
        if(err)return res(err);
        if(user) return res.status(400).json({
            error:true,
            message:"Already Logged In"
        });
        else{
            User.findOne({'email':req.body.email},function(err,user)
            {
                if(!user) return res.json({isAuth:false,message:'Email Not FOund!'});

                user.comparepassword(req.body.password,(err,isMatch)=>{
                    if(!isMatch)return res.join({isAuth:false,message:"password mismatched"});

                    user.generateToken((err,user)=>{
                        if(err)return res.status(400).send(err);
                        res.cookie('auth',user.token).json({
                            isAuth:true,
                            id:user._id,
                            email:user.email
                        })
                    })
                })
            })
        }
    })
})

server.get('/api/profile',auth,function(req,res)
{
    res.json({
        isAuth:true,
        id:req.user._id,
        email:req.user.email,
        name:req.user.name
    });
});
server.get('/api/delete',auth,function(req,res)
{
    req.user.deleteToken(req.token,(err,user)=>{
        if(err)return res.status(400).send(err);
        res.sendStatus(200);
    });
});

server.listen(port,()=>{
    console.log(`App working at ${port}`);
});