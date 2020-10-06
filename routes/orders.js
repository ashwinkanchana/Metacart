const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const moment = require('moment')
const { pool } = require('../config/database')

// GET orders page
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT o.order_id, o.created_at, o.txnamount, o.product_count, o.paymentmode, a.fullname, a.address, a.pincode, a.phone FROM orders AS o INNER JOIN address AS a ON o.address_id = a.id WHERE o.user_id = ? ORDER BY o.created_at DESC;'
        const filter = [req.user.id]
        const orders = await pool.query(query, filter)
        if (orders.length == 0) {
            return res.render('orders')
        }
        let ids = []

        orders.forEach((o, index) => {
            orders[index].items = []
            orders[index].created_at = moment(orders[index].created_at).utcOffset("+05:30").format('MMM Do YYYY, h:mm a');
            ids.push(parseInt(o.order_id))
        });

        const orderItemsQuery = `SELECT order_item.*, p.title, p.slug, p.image, c.slug as category_slug FROM order_item INNER JOIN product p ON order_item.product_id = p.id INNER JOIN category c ON p.category_id = c.id WHERE order_id IN (${mysql.escape(ids)});`
        pool.query(orderItemsQuery, (err, orderItems) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            orders.forEach((order, index) => {
                orderItems.forEach(item => {
                    if (order.order_id == item.order_id && item.status != 'Payment init') {
                        if (item.delivered_at) { 
                            item.validReturnWindow = (Math.ceil(Math.abs(new Date() - item.delivered_at)/(1000 * 60 * 60 * 24))<=30)
                            item.delivered_at = moment(item.delivered_at).utcOffset("+05:30").format('MMM Do YYYY, h:mm a')
                        }
                        orders[index].items.push(item)
                    }
                })
            })

            orders.forEach((o, index) => {
                if (o.items.length == 0)
                    orders.splice(index, 1);
            });

            res.render('orders', {
                orders
            })
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
}),


    // GET order item cancel 
    router.get('/cancel-item/:orderID/:productID', async (req, res) => {
        try {
            const orderID = parseInt(req.params.orderID)
            const productID = parseInt(req.params.productID)
            const userID = parseInt(req.user.id)
            const query = `UPDATE order_item SET status = IF((SELECT user_id FROM orders WHERE order_id = ${mysql.escape(orderID)}) = ${mysql.escape(userID)}, 'Cancelled', status) WHERE order_id = ${mysql.escape(orderID)} AND product_id = ${mysql.escape(productID)} AND status IN ('Payment Success', 'Confirmed', 'Dispatched');`
            const status = await pool.query(query)
            console.log(status);
            res.redirect('/orders')
        } catch (error) {
            console.log(error)
            req.flash('red', 'Something went wrong!')
            req.session.save(() => { res.redirect('/orders') })
        }
    })


// GET return reqest for item  
router.get('/return-item/:orderID/:productID', async (req, res) => {
    try {
        const orderID = parseInt(req.params.orderID)
        const productID = parseInt(req.params.productID)
        const userID = parseInt(req.user.id)
        const validReturnWindow = await veirfyReturnWindow(orderID, productID)
        if (validReturnWindow) {
            const query = `UPDATE order_item SET status = IF((SELECT user_id FROM orders WHERE order_id = ${mysql.escape(orderID)}) = ${mysql.escape(userID)}, 'Return requested', status) WHERE order_id = ${mysql.escape(orderID)} AND product_id = ${mysql.escape(productID)} AND status IN ('Delivered');`
            console.log(query)
            const status = await pool.query(query)
            console.log(status);
            res.redirect('/orders')
        } else {
            req.flash('red', 'Return window of 30 days has expired!')
            req.session.save(() => { res.redirect('/orders') })
        }

    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/orders') })
    }
})



async function veirfyReturnWindow(orderID, productID, userID) {
    try {
        const query = `SELECT DATEDIFF(NOW(),(SELECT delivered_at FROM order_item WHERE order_id = ${mysql.escape(orderID)} AND product_id = ${mysql.escape(productID)})) AS days_past;`
        const status = await pool.query(query)
        if(status[0].days_past <= 30){
            return true
        }
        return false
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/orders') })
    }

}


module.exports = router