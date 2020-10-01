const express = require('express')
const fs = require('fs-extra')
const router = express.Router()
const { pool } = require('../config/database')

// GET all products
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id;'
        const products = await pool.query(query)
        res.render('products', {
            title: 'All products',
            products
        })
    } catch (error) {
        console.log(error)
    }
})

// GET products by category
router.get('/:category', async (req, res) => {
    try {
        const category = req.params.category
        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE category.slug = ?; SELECT title FROM category WHERE slug = ?;'
        const filter = [category, category]
        const products = await pool.query(query, filter)
        if (products[1].length > 0){
            res.render('products', {
                title: products[1][0].title,
                products: products[0]
            })
        }else{
            req.flash('grey darken-4', 'Category doesn\'t exists')
            req.session.save(() => {  res.redirect('/products') }) 
        }
        
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => {  res.redirect('/products') }) 
    }
})

// GET product details
router.get('/:category/:product', async (req, res) => {
    try {
        const category = req.params.category
        const productSlug = req.params.product
        let galleryImages = null
        const query = 'SELECT * from product WHERE slug = ?'
        const filter = [productSlug]
        const product = (await pool.query(query, filter))[0]
        if(product){
            const galleryDir = `public/product_images/${product.id}/gallery`
            fs.readdir(galleryDir, (err, files) => {
                if (err) {
                    console.log(err)
                    req.flash('red', 'Something went wrong!')
                    req.session.save(() => {  res.redirect('/products') }) 
                } else {
                    galleryImages = files
                    res.render('product', {
                        title: product.title,
                        p: product,
                        galleryImages
                    })
                }
            })
        }else{
            req.flash('grey darken-4', 'Product doesn\'t exists')
            req.session.save(() => {  res.redirect('/products') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => {  res.redirect('/products') }) 
    }
})

module.exports = router