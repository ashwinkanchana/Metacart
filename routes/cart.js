const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const { pool } = require('../config/database')
const cryptoRandomString = require('crypto-random-string')
//PayTM payment gateway
const { initPayment, responsePayment } = require('../paytm/services/index')
const { isAuthenticated, ensureAuthenticated } = require('../controllers/auth')
const { updateCartDB, clearCartDB} = require('../controllers/cart')
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
            if(isAuthenticated(req)){
                const addToCartQuery = `INSERT INTO cart (user_id, product_id, quantity) VALUES(${mysql.escape(req.user.id)}, ${mysql.escape(product.id)}, 1)`
                updateCartDB(req, addToCartQuery, (err, status) => {
                    if(err){
                        console.log(err)
                    }
                    req.flash('grey darken-4', `Added ${product.title} to cart`)
                    res.redirect('back')
                })
            }else{
                req.flash('grey darken-4', `Added ${product.title} to cart`)
                res.redirect('back')
            }
        } else {
            req.flash('red', `Product not found!`)
            res.redirect('back')
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('back')
    }
})



// GET checkout page
router.get('/checkout', async (req, res) => {
    if (!req.session.cart || req.session.cart.length == 0) {
        req.flash('grey darken-4', 'Your cart is empty')
        res.redirect('/products')
    } else {
        console.log(req.session.cart)
        const sessionCart = req.session.cart
        let cartItemIds = []
        sessionCart.forEach(item => {
            cartItemIds.push(item.id)
        });

        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE product.id IN (?)';
        const filter = [cartItemIds]
        const productRows = await pool.query(query, filter)
        console.log(productRows)
        let mergedArray = []
        sessionCart.forEach((item, index)=>{
            const product = productRows.find(row => row.id === item.id);
            let mergedItem = {
                ...product,
                ...item
            }
            mergedItem.price = parseFloat(mergedItem.price).toFixed(2)
            mergedItem.image = `/product_images/${mergedItem.id}/${mergedItem.image}`
            mergedArray.push(mergedItem)
        })
      
        res.render('checkout', {
            title: 'Checkout',
            cart: mergedArray
        })
    }
})


// GET update cart product count
router.get('/update/:product', (req, res) => {
    const productID = req.params.product
    const cart = req.session.cart
    const action = req.query.action
    if(req.isAuthenticated())
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
                    if (cart[i].quantity < 1){
                        cart.splice(i, 1)
                        updateQuery = `DELETE FROM cart WHERE product_id = ${mysql.escape(productID)} AND user_id = ${mysql.escape(userID)};`   
                    }
                    else{
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
        if(userID != -1){
            updateCartDB(req, updateQuery, (err, status) => {
                if (err) {
                    console.log(err)
                }
                req.flash('grey darken-4', `Cart updated`)
                res.redirect('/cart/checkout')
            })
        }else{
            req.flash('grey darken-4', `Cart updated`)
            res.redirect('/cart/checkout')
        }
    } else {
        req.flash('grey darken-4', `Cart updated`)
        res.redirect('/cart/checkout')
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
                res.redirect('/products')
            })
        } else {
            req.flash('grey darken-4', `Cart cleared`)
            res.redirect('/products')
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/cart/checkout')
    }
})


//GET PayTM payment gateway
router.get("/payment",ensureAuthenticated, async (req, res) => {
    let transactionAmount = 0;
    const cart = req.session.cart
    if (typeof cart != "undefined" && cart.length > 0) {
        let filter = []
        cart.forEach(cartItem => {
            filter.push(cartItem.id)
        });
        filter = [filter, req.user.id]
        console.log(filter)
        const query = 'SELECT id, title, stock, price FROM product WHERE id IN (?);'
        const products = await pool.query(query, filter)
        console.log(products)
        
        //Check stocks and prevent overbooking
        let flash = []
        let mergedArray = []
        cart.forEach(cartItem => {
            const dbProduct = products.find(dbItem => dbItem.id === cartItem.id);
            console.log(`${dbProduct.stock} units of ${dbProduct.title} available`)
            console.log("order  " + cartItem.quantity)
            if (dbProduct.stock <= 0){
                flash.push(`${dbProduct.title} is out of stock`)
            }
            else if(dbProduct.stock - cartItem.quantity < 0){
                flash.push(`Only ${dbProduct.stock} units of ${dbProduct.title} is available`)
            }else{
                let subTotal = parseFloat(cartItem.quantity * dbProduct.price).toFixed(2)
                transactionAmount += +parseFloat(subTotal).toFixed(2)
                let mergedItem = {
                    ...dbProduct,
                    ...cartItem
                }
                mergedArray.push(mergedItem)
            }
        });
        if(flash.length > 0){
            req.flash('grey darken-4', flash)
            res.redirect('/cart/checkout')
        }else{

            const orderID = cryptoRandomString({ length: 16, type: 'numeric' })
            const userEmail = req.user.email
            const query = 'INSERT INTO orders (order_id, user_email, product_count, txnamount) VALUES (?);'
            const values = [[orderID, userEmail, mergedArray.length, transactionAmount]]
            const status = await pool.query(query, values)
            console.log(status)

            initPayment(orderID, userEmail, transactionAmount).then(
                redirectData => {
                    res.render("paytm_redirect", {
                        title: 'Payment',
                        resultData: redirectData,
                        paytm: process.env.PAYTM_FINAL_URL
                    })
                },
                error => {
                    res.send(error);
                }
            );
        }
    } else {
        req.flash('red', `Your cart is empty`)
        res.redirect('/cart/checkout')
    }

})


router.post("/paytm-response", (req, res) => {
    responsePayment(req.body).then(
        success => {
            console.log("paytm success")
            console.log(success)
            

            //if(paytment is success)
            //Decrement ordered items stock
            //insert order records to db
            //Clear cart items from session
            //clear cart items from DB

            res.render('paytm_response', {
                title: 'Order',
                resultData: "true",
                responseData: success
            });
        },
        error => {
            res.send(error);
        }
    );
});

module.exports = router