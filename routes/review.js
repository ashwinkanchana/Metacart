const express = require('express')
const mysql = require('mysql')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { reviewValidator } = require('../validators/review')
const { pool } = require('../config/database')
const Filter = require('bad-words')
const filter = new Filter();

// POST Submit new review 
router.post('/submit', reviewValidator, async (req, res) => {
    const review = filter.clean(req.body.review)
    const productID = parseInt(req.body.product)
    try {
        const errors = (await validationResult(req)).array();
        if (errors.length > 0) {
            req.flash('grey darken-4', errors[0].msg)
            req.session.save(() => { res.redirect('back') })
        }
        else {
            const query = `INSERT INTO reviews SET user_id = ${mysql.escape(req.user.id)}, product_id = ${mysql.escape(productID)}, review = ${mysql.escape(review)} ON DUPLICATE KEY UPDATE review =${mysql.escape(review)};`
            const status = await pool.query(query)
            console.log(status)
            res.redirect('back')
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/products') })
    }
})


// POST Edit review
router.post('/edit', reviewValidator, async (req, res) => {
    const review = filter.clean(req.body.review)
    const productID = req.body.product
    try {
        const errors = (await validationResult(req)).array();
        if (errors.length > 0) {
            req.flash('grey darken-4', errors[0].msg)
            req.session.save(() => { res.redirect('back') })
        }
        else {
            const query = `UPDATE reviews SET review = ${mysql.escape(review)} WHERE user_id = ${mysql.escape(req.user.id)} AND product_id = ${mysql.escape(productID)};`
            const status = await pool.query(query)
            console.log(status);
            res.redirect('back')
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/products') })
    }
})


// GET Delete review 
router.get('/delete/:productID', async (req, res) => {
    const productID = req.params.productID
    try {
        const query = `DELETE FROM reviews WHERE user_id = ${mysql.escape(req.user.id)} AND product_id = ${mysql.escape(productID)};`
        const status = await pool.query(query)
        if (status.affectedRows > 0) {
            req.flash('grey darken-4', 'Your review has been deleted')
            req.session.save(() => { res.redirect('back') })
        } else {
            req.flash('grey darken-4', 'Action denied')
            req.session.save(() => { res.redirect('back') })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong')
        req.session.save(() => { res.redirect('/products') })
    }
})

router.get('/rate', async (req, res) => {
    res.redirect('/')
})

// POST (AJAX) Submit new rating 
router.post('/rate', async (req, res) => {
    try {
        if (parseInt(req.body.value) < 1 || parseInt(req.body.value) > 5) {
            throw new Error('Invalid value')
        }
        const productID = mysql.escape(parseInt(req.body.product_id))
        const rating = mysql.escape(parseInt(req.body.value))
        const userID = mysql.escape(parseInt(req.user.id))
        const query = `INSERT INTO reviews (user_id, product_id, rating) select o.user_id, i.product_id, ${rating} as rating
        from orders o inner join order_item i on o.order_id = i.order_id WHERE o.user_id = ${userID} AND i.product_id = ${productID} ON DUPLICATE KEY UPDATE rating = ${rating};`
        const status = await pool.query(query)
        if (status.affectedRows > 0) {
            res.send({ 'message': 'Thank you for rating this product' })
        } else {
            res.status(403).send({ 'message': 'Please purchase the product to review' })
        }
    } catch (error) {
        console.log(error)
        res.status(500).send({ 'message': 'Something went wrong!' })
    }
})

module.exports = router