const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const { pool } = require('../config/database')
const cryptoRandomString = require('crypto-random-string')
//PayTM payment gateway
const { initPayment, responsePayment } = require('../paytm/services/index')
const { validationResult } = require('express-validator')
const { newAddressValidator } = require('../validators/account')
const { updateCartDB } = require('../controllers/cart')
// GET checkout page
router.get('/', async (req, res) => {
    try {
        if (!req.session.cart || req.session.cart.length == 0) {
            req.flash('grey darken-4', 'Your order is empty')
            res.redirect('/products')
        } else {
            const sessionCart = req.session.cart
            let cartItemIds = []
            sessionCart.forEach(item => {
                cartItemIds.push(item.id)
            });
            const addressQuery = 'SELECT * FROM address WHERE user_id = (?);';
            const addressFilter = [req.user.id]
            const address = await pool.query(addressQuery, addressFilter)
            const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE product.id IN (?);';
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
            let open_address_form;
            if(address.length>0)
                open_address_form = false
            else 
                open_address_form = true

            res.render('checkout', {
                title: 'Checkout',
                order: mergedArray,
                address,
                open_address_form
            })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/')
    }
})


// GET update cart product count
router.get('/update/:product', (req, res) => {
    try {
        const productID = req.params.product
        const cart = req.session.cart
        const action = req.query.action
        userID = req.user.id
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

        updateCartDB(req, updateQuery, (err, status) => {
            if (err) {
                console.log(err)
            }
            req.flash('grey darken-4', `Cart updated`)
            res.redirect('/checkout')
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/')
    }
})


// POST add new address
router.post('/add-address', newAddressValidator, async (req, res) => {
    try {
        const fullname = req.body.fullname
        const address = req.body.address
        const pincode = req.body.pin
        const phone = req.body.phone
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            res.render('checkout', {
                errors, fullname, address, pincode, phone,
                open_address_form: true
            })
        }
        else {
            const query = 'INSERT INTO address (user_id, fullname, address, pincode, phone) VALUES (?);'
            const values = [[req.user.id, fullname, address, pincode, phone]]
            const status = await pool.query(query, values)
            res.redirect('/checkout')
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/')
    }
})




//GET PayTM payment gateway
router.post("/payment", async (req, res) => {
    try {
        let transactionAmount = 0;
        const orderID = cryptoRandomString({ length: 16, type: 'numeric' })
        const cart = req.session.cart
        if (typeof cart != "undefined" && cart.length > 0) {
            let filter = []
            cart.forEach(cartItem => {
                filter.push(cartItem.id)
            });
            filter = [filter, req.user.id]
            const query = 'SELECT id, title, stock, price FROM product WHERE id IN (?);'
            const products = await pool.query(query, filter)


            //Check stocks and prevent overbooking
            let flash = []
            let mergedArray = []
            cart.forEach(cartItem => {
                const dbProduct = products.find(dbItem => dbItem.id === cartItem.id);
                if (dbProduct.stock <= 0) {
                    flash.push(`${dbProduct.title} is out of stock`)
                }
                else if (dbProduct.stock - cartItem.quantity < 0) {
                    flash.push(`Only ${dbProduct.stock} units of ${dbProduct.title} is available`)
                } else {
                    let subTotal = parseFloat(cartItem.quantity * dbProduct.price).toFixed(2)
                    transactionAmount += +parseFloat(subTotal).toFixed(2)
                    let mergedItem = {
                        ...dbProduct,
                        ...cartItem
                    }
                    mergedArray.push(mergedItem)
                }
            });
            if (flash.length > 0) {
                req.flash('grey darken-4', flash)
                res.redirect('/checkout')
            } else {
                const userID = req.user.id
                const query = 'INSERT INTO orders (order_id, user_id, product_count, txnamount) VALUES (?);'
                const values = [[orderID, userID, mergedArray.length, transactionAmount]]
                const status = await pool.query(query, values)
                const query2 = 'INSERT INTO order_item (order_id, product_id, purchase_price, quantity) VALUES ?;'
                let order_items = []
                mergedArray.forEach(item => {
                    order_items.push([orderID, item.id, item.price, item.quantity])
                })
                const status2 = await pool.query(query2, [order_items])
                initPayment(orderID, `${userID}`, transactionAmount).then(
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
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/cart/checkout')
    }
})


router.post("/paytm-response", (req, res) => {
    try {
        responsePayment(req.body).then(
            paytm => {
                console.log(paytm)
                if (paytm.STATUS == 'TXN_SUCCESS') {
                    res.render('paytm_response');
                    //Decrement ordered items stock
                    //insert order records to db
                    //Clear cart items from session
                    //clear cart items from DB 
                    const query = 'S (order_id, user_id, product_count, txnamount) VALUES (?);'
                    // const values = [[orderID, userEmail, mergedArray.length, transactionAmount]]
                    // const status = await pool.query(query, values)

                } else {
                    //view transaction failure message
                    res.render('paytm_response', {
                        title: 'Order',
                        resultData: "false",
                        responseData: paytm
                    });
                }

            },
            error => {
                res.send(error);
            }
        );
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/cart/checkout')
    }
});

module.exports = router