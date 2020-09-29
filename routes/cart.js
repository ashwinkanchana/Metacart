const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const { pool } = require('../config/database')
const cryptoRandomString = require('crypto-random-string')
//PayTM payment gateway
const { initPayment, responsePayment } = require('../paytm/services/index')
const { isAuthenticated, ensureAuthenticated } = require('../controllers/auth')
const { updateCartDB, clearCartDB } = require('../controllers/cart')
const { accessSync } = require('fs-extra')
const { query } = require('express')
const { deserializeUser } = require('passport')

// GET add product to cart
router.get('/add/:product', async (req, res) => {
    try {
        const productID = req.params.product
        const query = 'SELECT id, title from product WHERE id = ?;'
        const filter = [productID]
        const product = (await pool.query(query, filter))[0]
        console.log(product)
        if (product) {
            if (typeof req.session.cart == "undefined") {
                req.session.cart = []
                req.session.cart.push({
                    id: product.id,
                    quantity: 1
                })
            } else {
                const cart = req.session.cart
                let newItem = true
                for (let i = 0; i < cart.length; i++) {
                    if (cart[i].id == productID) {
                        cart[i].quantity++
                        newItem = false
                        break
                    }
                }
                if (newItem) {
                    req.session.cart.push({
                        id: product.id,
                        quantity: 1
                    })
                }
            }
            if (isAuthenticated(req)) {
                const addToCartQuery = `INSERT INTO cart (user_id, product_id, quantity) VALUES(${mysql.escape(req.user.id)}, ${mysql.escape(product.id)}, 1)`
                updateCartDB(req, addToCartQuery, (err, status) => {
                    if (err) {
                        console.log(err)
                    }
                    req.flash('grey darken-4', `Added ${product.title} to cart`)
                    req.session.save(() => { res.redirect('back') }) 
                })
            } else {
                req.flash('grey darken-4', `Added ${product.title} to cart`)
                req.session.save(() => { res.redirect('back') });
                
            }
        } else {
            req.flash('red', `Product not found!`)
            req.session.save(() => { res.redirect('back') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})



// GET cart page
router.get('/', async (req, res) => {
    try {
        if (!req.session.cart || req.session.cart.length == 0) {
            req.flash('grey darken-4', 'Your cart is empty')
            req.session.save(() => { res.redirect('/products') }) 
        } else {
            const sessionCart = req.session.cart
            let cartItemIds = []
            sessionCart.forEach(item => {
                cartItemIds.push(item.id)
            });

            const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE product.id IN (?)';
            const filter = [cartItemIds]
            const productRows = await pool.query(query, filter)
            let mergedArray = []
            sessionCart.forEach((item, index) => {
                const product = productRows.find(row => row.id === item.id);
                let mergedItem = {
                    ...product,
                    ...item
                }
                mergedItem.price = parseFloat(mergedItem.price).toFixed(2)
                mergedItem.image = `/product_images/${mergedItem.id}/${mergedItem.image}`
                mergedArray.push(mergedItem)
            })

            res.render('cart', {
                title: 'Cart',
                cart: mergedArray
            })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})


// GET update cart product count
router.get('/update/:product', (req, res) => {
    try {
        const productID = req.params.product
        const cart = req.session.cart
        const action = req.query.action
        if (req.isAuthenticated())
            userID = req.user.id
        else userID = -1
        let updateQuery = ''
        for (let i = 0; i < cart.length; i++) {
            if (cart[i].id == productID) {
                switch (action) {
                    case "add":
                        cart[i].quantity++
                        updateQuery = `UPDATE cart SET quantity = quantity + 1 WHERE user_id = ${mysql.escape(userID)}`
                        break
                    case "remove":
                        cart[i].quantity--;
                        if (cart[i].quantity < 1) {
                            cart.splice(i, 1)
                            updateQuery = `DELETE FROM cart WHERE product_id = ${mysql.escape(productID)} AND user_id = ${mysql.escape(userID)};`
                        }
                        else {
                            updateQuery = `UPDATE cart SET quantity = quantity - 1 WHERE user_id = ${mysql.escape(userID)}`
                        }
                        break
                    case "clear":
                        updateQuery = `DELETE FROM cart WHERE product_id = ${mysql.escape(productID)} AND user_id = ${mysql.escape(userID)};`
                        cart.splice(i, 1)
                        if (cart.length == 0)
                            delete req.session.cart
                        break
                    default: console.error('Something went wrong during update cart ')
                }
                break
            }
        }
        if (isAuthenticated(req)) {
            if (userID != -1) {
                updateCartDB(req, updateQuery, (err, status) => {
                    if (err) {
                        console.log(err)
                    }
                    req.flash('grey darken-4', `Cart updated`)
                    req.session.save(() => { res.redirect('/cart') }) 
                })
            } else {
                req.flash('grey darken-4', `Cart updated`)
                req.session.save(() => { res.redirect('/cart') }) 
            }
        } else {
            req.flash('grey darken-4', `Cart updated`)
            req.session.save(() => { res.redirect('/cart') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
    
})


// GET clear cart
router.get('/clear', (req, res) => {
    try {
        delete req.session.cart
        if (isAuthenticated(req)) {
            updateQuery = `DELETE FROM cart WHERE user_id = ${mysql.escape(req.user.id)};`
            updateCartDB(req, updateQuery, (err, status) => {
                if (err) {
                    console.log(err)
                }
                req.flash('grey darken-4', `Cart cleared`)
                req.session.save(() => { res.redirect('/products') }) 
            })
        } else {
            req.flash('grey darken-4', `Cart cleared`)
            req.session.save(() => { res.redirect('/products') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/cart') }) 
    }
})

module.exports = router