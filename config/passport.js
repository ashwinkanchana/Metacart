const localStrategy = require('passport-local').Strategy
const bcrypt = require('bcryptjs')
const User = require('../models/user')

module.exports = function (passport) {
    passport.use(new localStrategy(function (email, password, done) {
        console.log(`passport ${email} ${password}`)
        User.findOne({email}, (err, user)=>{
            if(err){
                return console.log(err)
            }
            console.log(`passport ${user} `)
            if(!user){
                return done(null, false, {
                    message: 'Email not registered'
                })
            }
            if(user){
                console.log(`passport compare `)
                bcrypt.compare(password, user.password, (err, isMatch)=> {
                    console.log('ismatch' + isMatch)
                    if (err){
                        console.log(err)
                    }
                    if (isMatch) {
                        return done(null, user)
                    }else{
                        return done(null, false, {
                            message: 'Password incorrect'
                        })
                    }
                    
                })
            }
        })
    }))
    passport.serializeUser(function (user, done) {
        done(null, user.id)
    })
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user)
        })
    })
}
