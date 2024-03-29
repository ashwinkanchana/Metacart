const sendgrid = require('@sendgrid/mail')
const jwt = require('jsonwebtoken')
sendgrid.setApiKey(process.env.SENDGRID_API_KEY)


exports.sendAccountActivationEmail = function (req, res, user, status) {

    const token = jwt.sign({
        token: user.verification_token
    }, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn: '1d' })


    const emailData = {
        from: process.env.EMAIL_FROM,
        fromname: 'MetaCart',
        to: user.email,
        subject: `Account activation link`,
        html: `<h4>please use the following link to activate your account</h4>
                                            <p>${process.env.CLIENT_URL}auth/activate/${token}</p><hr>
                                            <p>This link will expire in 24 hours</p>`
    }


    sendgrid.send(emailData).then(sent => {
        if (status == 'FRESH_SIGNUP') {
            req.flash('grey darken-4', `Please check ${user.email} for account activation link`)
        } else if (status == 'SECOND_SIGNUP_UNVERIFIED_ACCOUNT') {
            req.flash('grey darken-4', `Email is already in use, Activation link has been resent to ${user.email}`)
        } else if (status == 'UNVERIFIED_LOGIN_ATTEMPT') {
            req.flash('grey darken-4', `Please verify your email, link has been resent to ${user.email}`)
        }
        req.session.save(() => {  res.render('auth', {
            active_tab: 'login',
            open_modal: false
        }) }) 
        
    })
        .catch(err => {
            req.flash('red', 'Something went wrong at our end!')
            req.session.save(() => {  res.render('auth', {
                active_tab: 'login',
                open_modal: false
            }) })
        })
},

    exports.sendForgotPasswordEmail = function (req, res, user) {
        const token = jwt.sign({
            token: user.password_reset_token
        }, process.env.JWT_PASSWORD_RESET, { expiresIn: '1d' })
        const emailData = {
            from: process.env.EMAIL_FROM,
            fromname: 'MetaCart',
            to: user.email,
            subject: `Password reset link`,
            html: `<h4>please use the following link to reset your password</h4>
                                            <p>${process.env.CLIENT_URL}auth/reset-password/${token}</p><hr>
                                            <p>This link will expire in 24 hours</p>`
        }

        sendgrid.send(emailData)
            .then(sent => {
                req.flash('grey darken-4', `Password reset link has been sent to ${user.email}`)
                req.session.save(() => {  res.redirect('/auth') })
                
            })
            .catch(err => {
                req.flash('red', 'Something went wrong at our end!')
                req.session.save(() => {  res.render('forgot_password') })
            })
    }





