const { check } = require('express-validator')
exports.loginValidator = [
    check('password', 'Enter a valid password').trim().not().isEmpty(),
    check('username', 'Enter a valid email').trim().isEmail()
],
exports.signupValidator = [
    check('name', 'Enter your full name').trim().isLength({ min: 2 }),
    check('email', 'Enter a valid email').trim().isEmail(),
    check('password', 'Password must contain atleast 6 characters').trim().isLength({ min: 6 })
]

 

