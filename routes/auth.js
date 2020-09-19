const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const cryptoRandomString = require('crypto-random-string')
const { pool } = require('../config/database')

const { ensureGuest, ensureAuthenticated } = require('../controllers/auth')
const { loginValidator, signupValidator,
    forgotPasswordValidator,
    resetPasswordValidator } = require('../validators/auth')

//Cart controller
const { mergeCartOnLogin } = require('../controllers/cart')

//Email dispatch controller
const { sendAccountActivationEmail, sendForgotPasswordEmail } = require('../controllers/mail')
const { query } = require('express')


// GET auth page
router.get('/', ensureGuest, (req, res) => {
    res.render('auth', {
        active_tab: 'login',
        open_modal: false
    })
})


// GET login tab
router.get('/login', ensureGuest, (req, res) => {
    res.render('auth', {
        active_tab: 'login',
        open_modal: true
    })
})

// GET signup tab
router.get('/signup', ensureGuest, (req, res) => {
    res.render('auth', {
        active_tab: 'signup',
        open_modal: true
    })
})



// GET google oauth
router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] /*accessType: 'offline', approvalPrompt: 'force'*/ }))


// GET google oauth callback
router.get('/google/callback', passport.authenticate('google', {
    failureRedirect: '/auth/login',
    successRedirect: '/'
    //passReqToCallback: true
}))

// POST signup
router.post('/signup', ensureGuest, signupValidator, async (req, res) => {
    try {
        const name = req.body.name
        const email = req.body.email
        const password = req.body.password
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            res.render('auth', {
                errors, name, email, password,
                active_tab: 'signup',
                open_modal: true
            })
        }
        else {
            const query = 'SELECT * FROM user WHERE email = ? LIMIT 1;'
            const filter = [email]
            const user = (await pool.query(query, filter))[0]
            if (user) {
                if (user.verified) {
                    if (user.identifier == 'google') {
                        req.flash('grey darken-4', 'Account already exists, Please signin via Google')
                        res.redirect('/auth/login')
                    } else {
                        req.flash('grey darken-4', 'Account already exists, Please login')
                        res.render('auth', {
                            emailLogin: email,
                            active_tab: 'login',
                            open_modal: true
                        })
                    }
                } else {
                    const status = 'SECOND_SIGNUP_UNVERIFIED_ACCOUNT'
                    sendAccountActivationEmail(req, res, user, status)
                }
            } else {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(password, salt, async (err, hash) => {
                        if (err) {
                            console.log(err)
                        } else {
                            const email_verification = cryptoRandomString({ length: 32, type: 'alphanumeric' })
                            const query = 'INSERT INTO user (fullname, email, password, verification_token) VALUES (?); SELECT * FROM user WHERE email = ? LIMIT 1;';
                            const values = [[name, email, hash, email_verification], email]
                            const user = (await pool.query(query, values))[1][0]
                            const status = 'FRESH_SIGNUP';
                            sendAccountActivationEmail(req, res, user, status)
                        }
                    })
                })
            }
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/auth')
    }
})


// GET account activation
router.get('/activate/:jwt_token', ensureGuest, (req, res) => {
    try {
        const jwt_token = req.params.jwt_token
        jwt.verify(jwt_token, process.env.JWT_ACCOUNT_ACTIVATION, async (err, decoded) => {
            if (err) {
                console.log('Activation token error', err)
                req.flash('red', `Link is either expired or invalid, Please login again to get new activation link`)
                res.redirect('/auth')
            } else {
                const { token } = jwt.decode(jwt_token)
                const query = 'SELECT * FROM user WHERE verification_token = ? LIMIT 1;'
                const filter = [token]
                const user = (await pool.query(query, filter))[0]
                if (user) {
                    const query = 'UPDATE user SET verified = 1, verification_token = null WHERE verification_token = ?;'
                    const filter = [token]
                    const status = await pool.query(query, filter)
                    if (status.affectedRows) {
                        req.logIn(user, (err) => {
                            if (err) {
                                console.log(err)
                                req.flash('red', `Something went wrong`)
                                res.redirect('/auth')
                            } else {
                                //Merge cart items from session to DB and DB to Session
                                mergeCartOnLogin(req, user, (err, status)=>{
                                    req.flash('grey darken-4', `Hi ${user.fullname}!`)
                                    res.redirect('/')
                                })
                            }
                        })
                    }
                } else {
                    console.log("user not found")
                    req.flash('red', `Invalid activation link, Please signup to get new activation link`)
                    res.redirect('/auth')
                }
            }
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/auth')
    }
})


// POST login 
router.post('/login', ensureGuest, loginValidator, (req, res, next) => {
    const email = req.body.username
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('auth', {
            errors, emailLogin: email,
            active_tab: 'login',
            open_modal: true
        })
    }
    else {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                console.log(err)
            }
            if (!user) {
                req.flash('red', info.message)
                res.render('auth', {
                    emailLogin: email,
                    active_tab: 'login',
                    open_modal: true
                })
            }
            else if (user) {
                if (!user.verified) {
                    //user has not yet verified email
                    const status = 'UNVERIFIED_LOGIN_ATTEMPT';
                    sendAccountActivationEmail(req, res, user, status)
                } else {
                    req.logIn(user, (err) => {
                        if (err) {
                            console.log(err)
                            req.flash('red', `Something went wrong`)
                            res.redirect('/auth/login')
                        }

                        //Merge cart items from session to DB and DB to Session
                        mergeCartOnLogin(req, user, (err, status)=>{
                            req.flash('grey darken-4', `Hi ${user.fullname}!`)
                            res.redirect('/')
                        })
                    })
                }
            }
        })(req, res, next)
    }
})


// GET logout
router.get('/logout', ensureAuthenticated, (req, res) => {
    //req.session.cart = undefined
    req.logOut()
    req.flash('grey darken-4', 'Successfully Logged out')
    //set undefined for ejs
    res.locals.cart = undefined
    res.locals.user = undefined

    req.session.destroy((err) => {
        console.log('####### Sesssion destroyed ########')
        res.redirect('/auth/login')
    })
    
})



// GET password reset page
router.get('/forgot-password', ensureGuest, (req, res) => {
    res.render('forgot_password')
})

// POST password reset request
router.post('/forgot-password', ensureGuest, forgotPasswordValidator, async (req, res) => {
    const email = req.body.email
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('forgot_password', { errors })
    }
    else {
        try {
            const password_reset_token = cryptoRandomString({ length: 32, type: 'alphanumeric' })
            const values = [password_reset_token, email, email]
            const query = 'UPDATE user SET password_reset_token = ? WHERE email = ?; SELECT * FROM user WHERE email = ? LIMIT 1;'
            const status = await pool.query(query, values)
            console.log(status)
            if (status[0].affectedRows == 1) {
                const user = status[1][0];
                console.log("user-->" + user)
                sendForgotPasswordEmail(req, res, user)
            } else {
                //User not found
                req.flash('red', `Email not registered`)
                res.render('forgot_password')
            }
        } catch (error) {
            console.log(error)
            req.flash('red', 'Something went wrong!')
            res.redirect('/auth')
        }
    }
})


// GET password reset page
router.get('/reset-password/:jwt', ensureGuest, (req, res) => {
    const token_jwt = req.params.jwt
    res.render('reset_password', {
        token: token_jwt
    })
})

// POST password reset
router.post('/reset-password', ensureGuest, resetPasswordValidator, (req, res) => {
    const token_jwt = req.body.token
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('reset_password', {
            errors,
            token: token_jwt
        })
    } else {
        jwt.verify(token_jwt, process.env.JWT_PASSWORD_RESET, (err, decoded) => {
            if (err) {
                console.log('Password reset token error', err)
                req.flash('red', `Link is either expired or invalid, Please use a fresh link`)
                res.redirect('/auth/login')
            } else {
                const { token } = jwt.decode(token_jwt)
                const password = req.body.password
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(password, salt, (err, hash) => {
                        if (err) {
                            return console.log(err)
                        } else {
                            const query = 'UPDATE user SET password = ? , password_reset_token = null WHERE password_reset_token = ?;'
                            const values = [hash, token]
                            pool.query(query, values, (err, status) => {
                                if (err) {
                                    console.log(err)
                                    req.flash('red', `Something went wrong`)
                                    res.redirect('/auth')
                                }
                                console.log(status)
                                if (status.affectedRows == 1) {
                                    req.flash('green', `Successfully changed password`)
                                    res.redirect('/auth/login')
                                } else {
                                    console.log("User not found by reset token")
                                    req.flash('red', 'Link is either expired or invalid, Please use a valid link')
                                    res.redirect('/auth/login')
                                }
                            })
                        }
                    });
                });
            }
        })
    }
})





module.exports = router 