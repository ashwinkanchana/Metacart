const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { searchValidator } = require('../validators/search')
const { pool } = require('../config/database')


// POST search term
router.post('/products', searchValidator, async (req, res) => {
    const q = req.body.q
    console.log("sever: "+q)
    try {
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            req.flash('red', errors[0].msg)
            res.redirect('back')
        }
        else {
            const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id  WHERE product.title LIKE ?;'
            const filter = [`%${q}%`]
            const products = await pool.query(query, filter)   
            if(products.length >0){
                res.render('products', {
                    title: `Search Results for ${q}`,
                    products
                })
            }else{
                res.render('products', {
                    title: `Search Results for ${q}`,
                    products: []
                })
            }
            
        }
    } catch (error) {
        console.log(error)
    }
})


// POST search term
router.post('/filter', (req, res) => {
    const filter = req.body
    console.log(filter)
    res.redirect('/products')
})


module.exports = router