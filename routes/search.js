const express = require('express')
const mysql = require('mysql')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { searchValidator } = require('../validators/search')
const { pool } = require('../config/database')


// POST search term
router.post('/products', searchValidator, async (req, res) => {
    const q = req.body.q
    res.locals.currentPage = req.path.split('/')[1]
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
            const query = `SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id  WHERE product.title LIKE ? LIMIT ${skip},${limit};SELECT COUNT(*) AS count FROM(SELECT product.id FROM product WHERE product.title LIKE ?) AS count;`
            const filter = [`%${q}%`, `%${q}%`]
            const products = await pool.query(query, filter)
            const numPages = Math.ceil(products[1][0].count / limit);
            res.render('products', {
                title: `Search Results for ${q}`,
                products: products[0],
                numPages,
                limit,
                currentPage: startIndex,
                reqQuery: ''
            })


        }
    } catch (error) {
        console.log(error)
    }
})

module.exports = router