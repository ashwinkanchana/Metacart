const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const { pool } = require('../config/database')

// GET category index 
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT o.order_id, o.created_at, o.txnamount, o.product_count, o.paymentmode, a.fullname, a.address, a.pincode, a.phone FROM orders AS o INNER JOIN address AS a ON o.address_id = a.id ORDER BY o.created_at DESC;'
        const orders = await pool.query(query)
        if (orders.length == 0) {
            return res.render('orders', {
                orders: []
            })
        }
        let ids = []
        orders.forEach((o, index) => {
            orders[index].items = []
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
                    if (order.order_id == item.order_id && item.status != 'payment_init') {
                        orders[index].items.push(item)
                    }
                })
            })

            orders.forEach((o, index) => {
                if (o.items.length == 0)
                    orders.splice(index, 1);
            });

            res.render('./admin/orders', {
                orders
            })
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/')
    }
})


router.get('/update-order/:orderID/:productID/:status', async (req, res) => {
    try {
        const orderID = req.param.orderID
        const productID = req.param.productID
        const status = req.param.status

        const query = 'UPDATE order_item SET status = ? WHERE order_id = ? AND product_id = ?;'
        const values = [orderID, productID, status]
        const rows = await pool.query(query, values)
        console.log(rows)
        req.flash('grey darken-4', 'Order status updated')
        return req.session.save(() => { res.redirect('back') });
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        res.redirect('/')
    }
})



//add a dropdow for status

//Filter by orders tatus for admin

//Filter products route for user

//notification badges on top for cancel requests etc..

//add pagination

//home page

//similar products on product page

//ui improvements





module.exports = router