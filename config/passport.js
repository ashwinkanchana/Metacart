const localStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const bcrypt = require('bcryptjs')
const cryptoRandomString = require('crypto-random-string')
const User = require('../models/user')
const { findOneAndUpdate, update } = require('../models/user')

module.exports = function (passport) {
    passport.use(new localStrategy(function (email, password, done) {
        User.findOne({ email }, (err, user) => {
            if (err) {
                return console.log(err)
            }
            console.log(`passport ${user} `)
            if (!user) {
                return done(null, false, {
                    message: 'Email is not registered'
                })
            }
            if (user) {
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) {
                        console.log(err)
                    }
                    if (isMatch) {
                        return done(null, user)
                    } else {
                        if (user.identifier == 'google') {
                            return done(null, false, {
                                message: 'Please Signin via Google or set a new Password using Forgot password'
                            })
                        }else{
                            return done(null, false, {
                                message: 'Password is incorrect'
                            })
                        }         
                    }
                })

            }
        })
    }))


    // Google OAuth
    passport.use(
        new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            proxy: true
        },
            (accessToken, refreshToken, profile, done) => {
                const email = profile.emails[0].value
                User.findOne({ email }, async (err, user) => {
                    if (err) {
                        console.log(err)
                    }
                    if (user) {
                        if (!user.google_id) {
                            const update = {
                                verified: true,
                                google_id: profile.id,
                                email_verification: null
                            }
                            User.findOneAndUpdate({ email }, update, { new: true }, (err, user) => {
                                if (err) {
                                    console.log(err)
                                }
                                if (!user) {
                                    req.flash('red', `Something went wrong`)
                                    res.redirect('/auth')
                                }
                                if (user) {
                                    done(null, user)
                                }
                            })
                        } else {
                            done(null, user)
                        }
                    }
                    if (!user) {
                        //Generate random password for google user
                        const password = cryptoRandomString({ length: 32, type: 'alphanumeric' })
                        bcrypt.genSalt(10, function (err, salt) {
                            bcrypt.hash(password, salt, async (err, hash) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    const newUser = {
                                        name: profile.displayName,
                                        email,
                                        password: hash,
                                        verified: true,
                                        google_id: profile.id,
                                        identifier: 'google',
                                    }
                                    const savedUser = await User.create(newUser)
                                    done(null, savedUser)
                                }
                            })
                        })
                    }
                })
            })
    )


    passport.serializeUser(function (user, done) {
        done(null, user.id)
    })
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user)
        })
    })
}
