const express = require('express')
const router = express.Router()
const Product = require('../models/product')

//PayTM payment gateway
const { initPayment, responsePayment } = require('../paytm/services/index')


// GET add product to cart
router.get('/add/:product', (req, res) => {
    const product = req.params.product
    Product.findOne({ slug: product }, (err, p) => {
        if (err)
            console.log(err)
        if (typeof req.session.cart == "undefined") {
            req.session.cart = []
            req.session.cart.push({
                title: product,
                quantity: 1,
                price: parseFloat(p.price).toFixed(2),
                image: `/product_images/${p._id}/${p.image}`
            })
        } else {
            const cart = req.session.cart
            let newItem = true
            for (let i = 0; i < cart.length; i++) {
                if (cart[i].title == product) {
                    cart[i].quantity++
                    newItem = false
                    break
                }
            }
            if (newItem) {
                req.session.cart.push({
                    title: product,
                    quantity: 1,
                    price: parseFloat(p.price).toFixed(2),
                    image: `/product_images/${p._id}/${p.image}`
                })
            }
        }

        req.flash('grey darken-4', `Added ${p.title} to cart`)
        res.redirect('back')
    })
})



// GET checkout page
router.get('/checkout', (req, res) => {
    if (req.session.cart && req.session.cart.length == 0) {
        delete req.session.cart
        res.redirect('/cart/checkout')
    } else {
        res.render('checkout', {
            title: 'Checkout',
            cart: req.session.cart
        })
    }
})


// GET update cart product count
router.get('/update/:product', (req, res) => {
    const productSlug = req.params.product
    const cart = req.session.cart
    const action = req.query.action


    for (let i = 0; i < cart.length; i++) {
        if (cart[i].title == productSlug) {
            switch (action) {
                case "add":
                    cart[i].quantity++
                    break
                case "remove":
                    cart[i].quantity--;
                    if (cart[i].quantity < 1)
                        cart.splice(i, 1)
                    break
                case "clear":
                    cart.splice(i, 1)
                    if (cart.length == 0)
                        delete req.session.cart
                    break
                default: console.log('Something went wrong during update cart ')
            }
            break
        }
    }
    req.flash('grey darken-4', `Cart updated`)
    res.redirect('/cart/checkout')
})


// GET clear cart
router.get('/clear', (req, res) => {
    delete req.session.cart
    req.flash('grey darken-4', `Cart cleared`)
    res.redirect('/cart/checkout')
})


//GET PayTM payment gateway
router.get("/payment", (req, res) => {
    let transactionAmount = 0;
    const cart = req.session.cart
    if(typeof cart != "undefined" && cart.length > 0){
        cart.forEach(cartItem => {
            let subTotal = parseFloat(cartItem.quantity * cartItem.price).toFixed(2) 
            transactionAmount += +parseFloat(subTotal).toFixed(2)
        });
        initPayment(transactionAmount).then(
            success => {
                res.render("paytm_redirect", {
                    title: 'Payment',
                    resultData: success,
                    paytm: process.env.PAYTM_FINAL_URL
                })
            },
            error => {
                res.send(error);
            }
        );
    } else {
        req.flash('red', `Cart is empty`)
        res.redirect('/cart/checkout')
    }
    
})


router.post("/paytm-response", (req, res) => {
    responsePayment(req.body).then(
        success => {
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