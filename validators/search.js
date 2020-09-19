const { check } = require('express-validator')
exports.searchValidator = [
    check('q', 'Please enter a search term').trim().not().isEmpty(),
]


