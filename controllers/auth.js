module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        }
        req.session.redirectTo = req.originalUrl; 
        req.flash('red', 'Please login to continue')
        req.session.save(() => {  res.redirect('/auth/login') })
    },

    ensureGuest: function (req, res, next) {
        if (req.isAuthenticated()) {
            req.flash('red', 'Access denied')
            req.session.save(() => {  res.redirect('/home') })
        }
        else {
            return next()
        }
    },

    ensureAdmin: function (req, res, next) {
        if (req.isAuthenticated() && req.user.role == 'admin') {
            return next()
        }
        else {
            req.flash('red', 'Please login as Admin')
            req.session.save(() => {  res.redirect('/') })
        }
    },

    isAuthenticated: function (req) {
        if (req.isAuthenticated()) {
            return true
        }
        return false
    }
    
    
}