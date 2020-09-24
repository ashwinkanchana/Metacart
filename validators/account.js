const path = require('path')
const { check } = require('express-validator')

exports.newAddressValidator =  [
    check('fullname', 'Please enter a name').trim().not().isEmpty(),
    check('address', 'Please enter an address').trim().not().isEmpty(),
    check('pin', 'Please enter a 6 digit pincode').trim().isLength({ min: 6, max: 6 }),
    check('pin', 'Please enter a valid pincode').trim().isNumeric(),
    check('phone', 'Please enter a 10 digit phone number').trim().isLength({ min: 10, max: 10 }),
    check('phone', 'Please enter a valid phone number').trim().isNumeric()
]



