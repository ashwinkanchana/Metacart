const localStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const bcrypt = require('bcryptjs')
const cryptoRandomString = require('crypto-random-string')
const { use } = require('passport')
const { pool } = require('./database')
const { mergeCartOnLogin } = require('../controllers/cart')

module.exports = function (passport) {
    passport.use(new localStrategy(async function (email, password, done) {
        try {
            const query = 'SELECT * FROM user WHERE email = ? LIMIT 1;'
            const filter = [email]
            const user = (await pool.query(query, filter))[0]
            console.log(`passport ${user} `)
            if (!user) {
                return done(null, false, {
                    message: 'Email is not registered'
                })
            }
            else {
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
                        } else {
                            return done(null, false, {
                                message: 'Password is incorrect'
                            })
                        }
                    }
                })
            }
        } catch (error) {
            console.log(error)
        }
    }))


    // Google OAuth
    passport.use(
        new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            proxy: true,
            passReqToCallback: true
        },
            (req, accessToken, refreshToken, profile, done) => {
                const email = profile.emails[0].value
                const query = 'SELECT * FROM user WHERE email = ? LIMIT 1;'
                const filter = [email]
                pool.query(query, filter,  (err, rows) => {
                    if(err){
                        return console.log(err)
                    }
                    const user = rows[0]
                    if (user) {
                        if (!user.google_id) {
                            //link email account with google
                            const query = 'UPDATE user SET verified = 1, verification_token = null, google_id = ?, google_access_token = ?, google_refresh_token = ? WHERE email = ?; SELECT * FROM user WHERE email = ?'
                            const filter = [profile.id, accessToken, refreshToken, user.email, user.email]
                            pool.query(query, filter,  (err, status) => {
                                if (err) {
                                    return console.log(err)
                                }
                                console.log(status)
                                const updatedUser = status[1][0]
                                if (status[0].affectedRows) {
                                    //done(null, updatedUser)
                                    mergeCartOnLogin(req, user, (err, isMergeSuccess) => {
                                        if(err){
                                            console.log(err)
                                        }
                                        done(null, updatedUser)
                                    })
                                }
                            })
                        } else {
                            //done(null, user)
                            //Merge Cart items in session to DB
                            mergeCartOnLogin(req, user, (err, isMergeSuccess)=>{
                                if(err){
                                    console.log(err)
                                }
                                done(null, user)
                            })
                        }
                    }
                    else {
                        //Generate random password for google user
                        const password = cryptoRandomString({ length: 32, type: 'alphanumeric' })
                        bcrypt.genSalt(10, function (err, salt) {
                            bcrypt.hash(password, salt, (err, hash) => {
                                if (err) {
                                    return console.log(err)
                                } else {
                                    const newUser = [[profile.displayName, email, hash, true, profile.id, 'google', accessToken, refreshToken], email]
                                    const query = 'INSERT INTO user (fullname, email, password, verified, google_id, identifier, google_access_token, google_refresh_token) VALUES(?); SELECT * FROM user WHERE email = ?;'
                                    pool.query(query, newUser,  (err, status) => {
                                        if (err) {
                                            return console.log(err)
                                        }
                                        const newGoogleUser = status[1][0]

                                        //done(null, newGoogleUser)
                                        //Merge Cart items in session to DB
                                        mergeCartOnLogin(req, user, (err, isMergeSuccess) => {
                                            if(err){
                                                console.log(err)
                                            }
                                            done(null, newGoogleUser)
                                        })
                                    })

                                }
                            })
                        })
                    }
                })
            }))


    passport.serializeUser(function (user, done) {
        done(null, user.id)
    })
    passport.deserializeUser(function (id, done) {
        const query = 'SELECT * FROM user WHERE id = ?;'
        const filter = [id]
        pool.query(query, filter, function (err, rows) {
            done(err, rows[0]);
        });
    })
}
