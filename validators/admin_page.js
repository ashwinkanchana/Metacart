const { check } = require('express-validator')
exports.titleContentValidator = [
    check('title', 'Title is required').trim().not().isEmpty(),
    check('content', 'Content is required').trim().not().isEmpty()
]


