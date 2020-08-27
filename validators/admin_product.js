const path = require('path')
const { check } = require('express-validator')

exports.titleDescPriceImageValidator =  [
        check('title', 'Title is required').trim().not().isEmpty(),
        check('desc', 'Description is required').trim().not().isEmpty(),
        check('price', 'Price must have a value').trim().not().isEmpty().isDecimal(),
        check('image', 'Image must be JPG or PNG').custom((value, { req }) => {
            const temp = value.toLowerCase()
            console.log(temp)
            if (path.extname(temp) === '.jpg' || path.extname(temp) === '.png' || path.extname(temp) === '.jpeg')
                return true;
            return false;
        })

]



