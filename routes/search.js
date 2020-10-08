const express = require('express')
const mysql = require('mysql')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { searchValidator } = require('../validators/search')
const { pool } = require('../config/database')
const Filter = require('bad-words')
const wordFilter = new Filter();

// POST search term
router.post('/products', searchValidator, async (req, res) => {
    const q = req.body.q
    try {
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            req.flash('red', errors[0].msg)
            req.session.save(() => { res.redirect('back') })
        }
        else {
            const startIndex = mysql.escape(parseInt(req.query.page - 1 || 0))
            const limit = mysql.escape(parseInt(req.query.limit || 12))
            const skip = startIndex * limit
            const query = `SELECT p.id, p.title, p.slug, p.price, p.image, p.stock, c.slug AS category, avg(r.rating) as rating, count(r.rating) as count FROM product p INNER JOIN category c ON p.category_id = c.id LEFT JOIN reviews r ON p.id = r.product_id WHERE p.title LIKE ? GROUP BY p.id LIMIT ${skip},${limit}; SELECT COUNT(*) AS count FROM(SELECT product.id FROM product WHERE product.title LIKE ?) AS count;`
            const filter = [`%${q}%`, `%${q}%`]
            const products = await pool.query(query, filter)
            const numPages = Math.ceil(products[1][0].count / limit);
            res.render('products', {
                title: `Search Results for ${wordFilter.clean(q)}`,
                products: products[0],
                numPages,
                limit,
                currentPage: startIndex,
                reqQuery: ''
            })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})

module.exports = router