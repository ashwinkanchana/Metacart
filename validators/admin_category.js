const { check } = require('express-validator')
exports.titleValidator = [
    check('title', 'Title is required').trim().not().isEmpty(),
]


