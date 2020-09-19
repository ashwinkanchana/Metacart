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
        console.log("ensure admin->")
        console.log(req.user)
        if (req.isAuthenticated() && req.user.role == 'admin') {
            return next()
        }
        else {
            req.flash('red', 'Please login as Admin')
            res.redirect('/')
        }
    },

    isAuthenticated: function (req) {
        if (req.isAuthenticated()) {
            return true
        }
        return false
    }
    
    
}