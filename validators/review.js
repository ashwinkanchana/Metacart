const { check } = require('express-validator')
const { pool } = require('../config/database')
exports.reviewValidator = [
    check('review', 'Please write a review to submit').trim().not().isEmpty(),
    check('review', 'Please add a rating to submit').custom(async (value, { req }) => {
        const query = `SELECT rating FROM reviews WHERE user_id = ? AND product_id = ?;`
        const values = [parseInt(req.user.id), parseInt(req.body.product)]
        try {
            const row = await pool.query(query, values)
            if(row.length>0){
                return true;
            }else{
                return false;
            }
        } catch (error) {
            console.log(err);
            throw new Error(err)
        }
    })
]



