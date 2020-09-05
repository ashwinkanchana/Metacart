const user = require("../models/user")

module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        }
        req.flash('red', 'Please login access this resource')
        res.redirect('/auth/login')
    },

    ensureGuest: function (req, res, next) {
        if (req.isAuthenticated()) {
            req.flash('red', 'Access denied')
            res.redirect('/home')
        }
        else {
            return next()
        }
    },

    ensureAdmin: function (req, res, next) {
        if (req.isAuthenticated() && res.locals.user.admin == 1) {
            return next()
        }
        else {
            req.flash('red', 'Please login as Admin')
            res.redirect('/')
        }
    }
    // ensureVerified
    
    
}