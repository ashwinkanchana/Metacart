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
const { accessSync } = require('fs-extra')
// GET checkout page
router.get('/', async (req, res) => {
    try {
        if (!req.session.cart || req.session.cart.length == 0) {
            req.flash('grey darken-4', 'Your order is empty')
            req.session.save(() => { res.redirect('/products') })
        } else {
            const mergedArray = await getCartItems(req.session.cart)
            const address = await getAddresses(req.user.id)
            let open_address_form;
            if (address.length > 0)
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
        req.session.save(() => { res.redirect('/') })
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
            req.session.save(() => { res.redirect('/checkout') })
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})


// POST add new address
router.post('/add-address', newAddressValidator, async (req, res) => {
    try {
        const fullname = req.body.fullname
        const new_address = req.body.address
        const pincode = req.body.pin
        const phone = req.body.phone
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            const address = await getAddresses(req.user.id)
            const mergedArray = await getCartItems(req.session.cart)
            res.render('checkout', {
                errors: [errors[0]], fullname, address, new_address, pincode, phone,
                open_address_form: true,
                order: mergedArray
            })
        }
        else {
            const query = 'INSERT INTO address (user_id, fullname, address, pincode, phone) VALUES (?);'
            const values = [[req.user.id, fullname, new_address, pincode, phone]]
            const status = await pool.query(query, values)
            req.flash('grey darken-4', 'Added a new address')
            req.session.save(() => { res.redirect('/checkout') })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})



async function getCartItems(sessionCart) {
    try {
        let cartItemIds = []
        sessionCart.forEach(item => {
            cartItemIds.push(item.id)
        });
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
        return mergedArray
    } catch (error) {
        throw new Error(error);
    }
}


async function getAddresses(userID) {
    try {
        const addressQuery = 'SELECT * FROM address WHERE user_id = (?);';
        const address = await pool.query(addressQuery, [userID])
        return address
    } catch (error) {
        throw new Error(error)
    }
}

//verifying given address id belongs to current user
async function verifyAddress(userID, addressID) {
    try {
        const addressQuery = 'SELECT id FROM address WHERE user_id = ? AND id = ?;';
        const count = await pool.query(addressQuery, [userID, addressID])
        return count.length
    } catch (error) {
        throw new Error(error)
    }
}


//GET PayTM payment gateway
router.post("/payment", async (req, res) => {
    try {
        const deliveryAddressID = parseInt(req.body.selected_address)
        if (await verifyAddress(req.user.id, deliveryAddressID) == 0) {
            req.flash('red', `Invalid address`)
            return req.session.save(() => { res.redirect('/checkout') });
        }
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
                    flash.push(`${dbProduct.title} is out of stock, please remove ${dbProduct.title} to proceed`)
                }
                else if (dbProduct.stock - cartItem.quantity < 0) {
                    flash.push(`Only ${dbProduct.stock} unit of ${dbProduct.title} is available, please reduce quantity`)
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
                return req.session.save(() => { res.redirect('/checkout') });
            } else {
                const userID = req.user.id
                const query = 'INSERT INTO orders (order_id, user_id, address_id, product_count, txnamount) VALUES (?);'
                const values = [[orderID, userID, deliveryAddressID, mergedArray.length, transactionAmount]]
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
                        console.log(error)
                        res.render('./errors/invalid_checksum', {
                            paytmError: error
                        });
                    }
                );
            }
        } else {
            req.flash('red', `Your order is empty`)
            req.session.save(() => { res.redirect('/checkout') })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})

//POST paytm response
router.post("/paytm-response", (req, res) => {
    try {
        responsePayment(req.body).then(
            paytm => {
                const paymentmode = getPaymentModeName(paytm.PAYMENTMODE)
                const query = 'UPDATE orders SET txnid = ?, payment_status = ?, respcode = ?, respmsg = ?, gateway = ?, bankname = ?, paymentmode = ? WHERE order_id = ?'
                const values = [paytm.TXNID, paytm.STATUS, paytm.RESPCODE, paytm.RESPMSG, paytm.GATEWAYNAME, paytm.BANKNAME, paymentmode, paytm.ORDERID]
                pool.query(query, values, function (error, status) {
                    if (error) {
                        console.log(error)
                        throw new Error(error)
                    }
                })
                if (paytm.STATUS == 'TXN_SUCCESS') {
                    //update order status in DB
                    //Clear cart items from DB 
                    const query = 'UPDATE order_item SET status = \'Payment success\' WHERE order_id = ?; DELETE FROM cart WHERE user_id = ?; SELECT product_id, quantity FROM order_item WHERE order_id = ?'
                    const filter = [paytm.ORDERID, req.user.id, paytm.ORDERID]
                    pool.query(query, filter, (error, rows) => {
                        if (error) {
                            console.log(error)
                            throw new Error(error)
                        }
                        orderProducts = rows[2];

                        //Clear cart from session
                        delete req.session.cart

                        //Decrement ordered product stock
                        let updateStockQueries = '';
                        orderProducts.forEach(item => {
                            updateStockQueries += `UPDATE product SET stock = stock - ${mysql.escape(item.quantity)} WHERE id = ${mysql.escape(item.product_id)} and stock  > 0;`
                        });

                        console.log(updateStockQueries)
                        pool.query(updateStockQueries, (err, status) => {
                            if (err) {
                                console.log(err)
                                throw new Error(err)
                            }
                            console.log(status)
                            res.render('paytm_response', {
                                title: 'Transaction Success',
                                redirectTo: `/checkout/transaction/${paytm.ORDERID}`
                            });
                        })
                    })
                } else {
                    //Go to retry order page
                    res.render('paytm_response', {
                        title: 'Transaction Failed',
                        redirectTo: `/checkout/transaction/${paytm.ORDERID}`
                    });
                }
            },
            error => {
                //Invalid paytm checksum 
                console.log(error)
                res.render('./errors/invalid_checksum', {
                    paytmError: error
                });
            }
        );
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/checkout') })
    }
});


router.get('/transaction/:orderID', async (req, res) => {
    const orderID = req.params.orderID
    //verifying order id belongs to user
    const query = 'SELECT * FROM orders WHERE order_id = ? AND user_id = ?;'
    const filter = [orderID, req.user.id]
    const order = await pool.query(query, filter)
    if (order.length == 0 || order.txnid == '') {
        req.flash('grey darken-4', 'Invalid ID')
        return req.session.save(() => { res.redirect('/') });
    }
    res.render('transaction', {
        order: order[0]
    })
})



function getPaymentModeName(code) {
    switch (code) {
        case 'CC':
            return 'Credit card'
        case 'DC':
            return 'Debit card'
        case 'CC':
            return 'Credit card'
        case 'NB':
            return 'Net Banking'
        case 'UPI':
            return 'UPI'
        case 'PPI':
            return 'Paytm wallet'
        case 'PAYTMCC':
            return 'Postpaid'
    }
}

module.exports = router