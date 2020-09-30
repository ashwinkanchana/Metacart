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
                    if(order.order_id == item.order_id && item.status != 'Payment init'){
                        orders[index].items.push(item)
                    }
                })
            })

            orders.forEach((o, index) => {
                if(o.items.length == 0)
                orders.splice(index, 1);
            });
            
            res.render('orders', {
                orders
            })
        })
    } catch(error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})



module.exports = router