const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { searchValidator } = require('../validators/search')
const { pool } = require('../config/database')


// POST search term
router.post('/', searchValidator, async (req, res) => {
    const q = req.body.q
    console.log(q)
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


const searchTerms = async () =>{
    const query = 'SELECT id, title, image FROM product;'   
    const products = await pool.query(query)
    let searchTerms = {}
    products.forEach(p => {
        terms.p.title = `/product_images /${p.id}/${p.image}`
    });
    searchTerms = JSON.stringify(searchTerms)
}


module.exports = router