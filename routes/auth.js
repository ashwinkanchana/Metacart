const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')
const cryptoRandomString = require('crypto-random-string')
const User = require('../models/user')

const { ensureGuest, ensureAuthenticated } = require('../controllers/auth')
const { loginValidator, signupValidator } = require('../validators/auth')

//Email dispatch controller
const { sendAccountActivationEmail } = require('../controllers/mail')


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

// POST signup
router.post('/signup', ensureGuest, signupValidator, (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('auth', {
            errors,
            name,
            email,
            password,
            active_tab: 'signup',
            open_modal: true
        })
    }
    else {
        User.findOne({ email }, (err, user) => {
            if (err) {
                console.log(err)
            }
            if (user) {
                if (user.verified) {
                    req.flash('grey darken-4', 'Account already exists, Please login')
                    res.render('auth', {
                        emailLogin: email,
                        active_tab: 'login',
                        open_modal: true
                    })
                } else {
                    const status = 'SECOND_SIGNUP_UNVERIFIED_ACCOUNT'
                    sendAccountActivationEmail(req, res, user, status)
                }
            } else {
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(password, salt, function (err, hash) {
                        if (err) {
                            console.log(err)
                        } else {
                            const user = new User({
                                name: name,
                                email,
                                password: hash,
                                verified: false,
                                email_verification: cryptoRandomString({ length: 32, type: 'alphanumeric' }),
                                identifier: 'email',
                            })
                            user.save((err) => {
                                if (err) {
                                    console.log(err)
                                } else {
                                    const status = 'FRESH_SIGNUP';
                                    sendAccountActivationEmail(req, res, user, status)
                                }
                            })
                        }
                    });
                });


            }
        })
    }
})


// GET account activation
router.get('/activate/:jwt_token', ensureGuest, (req, res) => {
    const jwt_token = req.params.jwt_token
    if (jwt_token) {
        jwt.verify(jwt_token, process.env.JWT_ACCOUNT_ACTIVATION, function (err, decoded) {
            if (err) {
                console.log('Activation token error', err)
                req.flash('red', `Link is either expired or invalid, Please login again to get new activation link`)
                res.render('auth', {
                    active_tab: 'login',
                    open_modal: false
                })
            } else {
                const { token } = jwt.decode(jwt_token)
                User.findOne({ email_verification: token }, (err, user) => {
                    if (err) {
                        console.log(err)
                    }
                    if (user) {
                        const filter = { email_verification: token };
                        const update = {
                            email_verification: null,
                            verified: true
                        }
                        User.findOneAndUpdate(filter, update, (err, user) => {
                            if (err) {
                                console.log(err)
                            }
                            req.flash('green', `Account activated successfully`)
                            res.render('auth', {
                                active_tab: 'login',
                                open_modal: true
                            })
                        });

                    } else {
                        req.flash('red', `Link is either expired or invalid, Please signup to get new activation link`)
                        res.render('auth', {
                            active_tab: 'signup',
                            open_modal: false
                        })
                    }
                })

            }
        })
    } else {
        req.flash('red', `Link is either expired or invalid`)
        res.render('auth', {
            active_tab: 'signup',
            open_modal: false
        })
    }
})


// POST login 
router.post('/login', ensureGuest, loginValidator, (req, res, next) => {
    const email = req.body.username
    const password = req.body.password
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('auth', {
            errors,
            emailLogin: email,
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
                        req.flash('grey darken-4', `Hi ${user.name}!`)
                        res.redirect('/home')
                    })
                }
            }
        })(req, res, next)
    }
})




// GET logout
router.get('/logout', ensureAuthenticated, (req, res) => {
    req.logOut()
    req.flash('grey darken-4', 'Successfully Logged out')
    res.redirect('/auth/login')
})


module.exports = router 