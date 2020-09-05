const mongoose = require('mongoose')

// User Schema
const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    email_verification: {
        type: String,
        default: null
    },
    password_reset: {
        type: String,
        default: null
    },
    google_id: {
    type: String,
    default: null
    },
    identifier: {
        type: String,
    },
    admin: {
        type: Number,
        default: 0
    }

})

const User = module.exports = mongoose.model('User', UserSchema)

