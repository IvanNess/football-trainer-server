const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    token: String,
    remember: Boolean,
    results: [
        {
            score: Number,
            questions: Number,
            date: Date
        }
    ]
})

module.exports = UserSchema