const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')

// GET home page
router.get('/', async (req, res) => {
    try {
        const pages = req.app.locals.pages
        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id ORDER BY RAND() LIMIT 8;'
        const homepageProducts = await pool.query(query)
        res.render('home', {
            homepageProducts
        })   
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})

// GET page
router.get('/:slug', async (req, res) => {
    try {
        const pages = req.app.locals.pages
        const query = 'SELECT * FROM page WHERE slug = ?;'
        const filter = [req.params.slug]
        const page = (await pool.query(query, filter))[0]
        if (page) {
            res.render('index', {
                pages,
                title: page.title,
                content: page.content,
            })
        } else {
            req.flash('grey darken-4', 'Page doesn\'t exists')
            req.session.save(() => { res.status(404).render('./errors/404') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})

module.exports = router