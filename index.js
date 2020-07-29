const mongoose = require('mongoose')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
//const jwt = require('jsonwebtoken')
const session = require('express-session')
const bcrypt = require('bcryptjs')

const passport = require('passport')
//const LocalStrategy = require('passport-local').Strategy

const UserSchema = require('./schema')

const User = mongoose.model('User', UserSchema)

// passport.use(new LocalStrategy(async function (username, password, done) {
//     console.log(username, password)
//     try {
//         const user = await User.findOne({ username: username })
//         if (!user) {
//             return done(null, false, { message: 'Incorrect username.' })
//         }
//         const isPasswordCorrect = await bcrypt.compare(password, user.password)
//         if (!isPasswordCorrect) {
//             return done(null, false, { message: 'Incorrect password.' })
//         }
//         return done(null, user)
//     } catch (err) {
//         return done(err)
//     }
// }));

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_URI}/${process.env.MONGO_DB}?retryWrites=true&w=majority`

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const dbConnection = mongoose.connection
dbConnection.on('error', console.error.bind(console, 'connection error:'))
dbConnection.once('open', function () {
    // we're connected!
    //console.log('db connected!!!')
});

const app = express()
app.use(cors({
    origin: process.env.ORIGIN,// allow to server to accept request from different origin
    //methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // allow session cookie from browser to pass through,
}))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}))

app.use(bodyParser.json()) //чтобы парсить json

app.use(passport.initialize())

app.use(passport.session())

passport.serializeUser(function (user, done) {
    //console.log('user_to serialize', user)
    done(null, user._id)
});

passport.deserializeUser(function (id, done) {
    //console.log('object_to deserialize', id)    
    const user = User.find({ _id: id })
    done(null, user);
});

app.post('/signup', async (req, res, next) => {
    //console.log(req)
    const existingUser = await User.findOne({ username: req.body.data.username })
    //console.log(existingUser)
    if (existingUser) {
        return res.sendStatus(403)
    }
    //const hashPassword = await bcrypt.hash(req.body.data.password, 10)
    const user = await new User({
        username: req.body.data.username,
        password: req.body.data.password,
        //password: hashPassword,
        token: req.body.data.token,
        remember: req.body.data.remember
    })
    await user.save()
    //console.log(user)
    req.login(user, function (err) {
        if (err) { return next(err); }
        return res.status(200).send({
            username: user.username
        });
    })
})

app.post('/login', async (req, res, next) => {
    //console.log(req)
    const user = await User.findOne({ username: req.body.data.username })
    //console.log(user)
    if (!user) {
        return res.sendStatus(403)
    } 
    //console.log(req.body.data.password, user.password)
    const passwordCheck = await bcrypt.compare(req.body.data.password, user.password)
    //console.log(await bcrypt.compare(req.body.data.password, user.password))
    if (!passwordCheck) {
        return res.sendStatus(403)
    }    
    req.login(user, function (err) {
        if (err) { return next(err); }
        return res.status(200).send({
            username: user.username
        });
    })
})

app.post('/logout', async (req, res, next) => {
    //console.log('logout')
    req.logout()
    res.status(200).send({
        username: null
    })
})

app.post('/user', async (req, res, next) => {
    //console.log(req)
    if (!req.session.passport) {
        return res.sendStatus(404)
    }
    const user = await User.findOne({ _id: req.session.passport.user })
    //console.log('user', user)
    const fullLoad = req.body.fullLoad
    if (user && !fullLoad) {
        return res.status(200).send({
            username: user.username
        })
    }
    if (user && fullLoad) {
        return res.status(200).send({
            username: user.username,
            remember: user.remember,
            results: user.results
        })
    }
    if(!user){
        return res.sendStatus(404)
    }
})

app.post('/record', async (req, res, next) => {
    //console.log(req)
    if (!req.session.passport) {
        return res.sendStatus(403)
    }
    const user = await User.findOne({ _id: req.session.passport.user })
    if(!user){
        return res.sendStatus(404)
    }
    //console.log('user', user)
    const record = req.body.data
    user.results = [...user.results, {
        score: record.score,
        questions: record.questionNumber,
        date: new Date()
    }]
    await user.save()
    return res.sendStatus(200)
})

app.get('/', (req, res) => {
    //console.log(req)
    res.send('ok')
})

app.listen(process.env.PORT || 4000, () => {
    console.log('calc app started')
})