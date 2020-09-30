const express = require('express')
const router = express.Router()
const mysql = require('mysql')
const moment = require('moment')
const cryptoRandomString = require('crypto-random-string')
const { pool } = require('../config/database')

router.get('/', (req, res) => {
    res.redirect('/admin/orders/new')
})

// GET orders by status index 
router.get('/:slug', async (req, res) => {
    try {
        let status = getStatusFromSlug(req.params.slug)
        if (status == '') {
            throw new Error('Not a valid status')
        }
        let orderItemsQuery = ''
        if (status == 'All') {
            orderItemsQuery = `SELECT i.*, p.title, p.slug, p.image, c.slug as category_slug FROM order_item i INNER JOIN product p ON i.product_id = p.id INNER JOIN category c ON p.category_id = c.id;`
        } else {
            orderItemsQuery = `SELECT i.*, p.title, p.slug, p.image, c.slug as category_slug FROM order_item i INNER JOIN product p ON i.product_id = p.id INNER JOIN category c ON p.category_id = c.id WHERE i.status = ${mysql.escape(status)};`
        }
        const orderItems = await pool.query(orderItemsQuery)

        const count = await getOrderCountByStatus()

        if (status == 'Payment success')
            status = 'New'

        if (orderItems.length == 0) {
            return res.render('./admin/orders', {
                orderFilter: {
                    status,
                    count,
                }
            })
        }
        let ids = []
        orderItems.forEach((o, index) => {
            if(!ids.includes(parseInt(o.order_id)))
                ids.push(parseInt(o.order_id))
        });
        
        
        const ordersQuery = `SELECT o.order_id, o.created_at, o.txnamount, o.product_count, o.paymentmode, a.fullname, a.address, a.pincode, a.phone FROM orders AS o INNER JOIN address AS a ON o.address_id = a.id WHERE o.order_id in (${mysql.escape(ids)}) ORDER BY o.created_at DESC;`
        let orders = await pool.query(ordersQuery)
        
        orders.forEach((o, index) => {
            orders[index].items = []
            orders[index].created_at = moment(orders[index].created_at).utcOffset("+05:30").format('MMM Do YYYY, h:mm a');
        });
        
        orders.forEach(o =>{
            orderItems.forEach(item =>{
                if (o.order_id == item.order_id && item.status != 'payment_init') {
                    o.items.push(item)
                }
            })
        })


        let ordersArray = []
        orders.forEach(o => {
            ordersArray.push(o)
        }); 
        
        
        res.render('./admin/orders', {
            orders: ordersArray,
            orderFilter: {
                status,
                count
            }
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})

async function getOrderCountByStatus() {
    try {
        const query = 'SELECT SUM(status = \'Payment init\') AS payment_init, SUM(status = \'Payment pending\') AS payment_pending, SUM(status = \'Payment Success\') AS payment_success, SUM(status = \'Payment failure\') AS payment_failure, SUM(status = \'Confirmed\') AS confirmed, SUM(status = \'Dispatched\') AS dispatched, SUM(status = \'Delivered\') AS delivered, SUM(status = \'Return requested\') AS return_requested, SUM(status = \'Returned\') AS returned, SUM(status = \'Replacement requested\') AS replacement_requested, SUM(status = \'Replaced\') AS replaced, SUM(status = \'Cancelled\') AS cancelled FROM order_item; SELECT COUNT(CONCAT(order_id, \'-\', product_id)) count FROM order_item;'
        let res = await pool.query(query)
        res[0][0].all = res[1][0].count
        return res[0][0];
    } catch (error) {
        console.log(error);
        throw new Error(error)
    }
}


router.post('/update-order-item', async (req, res) => {
    try {
        const orderId = req.body.orderID
        const productID = req.body.productID
        const status = req.body.value
        var valid_statuses = ['Confirmed', 'Dispatched', 'Delivered', 'Return requested', 'Returned', 'Cancelled']
        var isValidStatus = valid_statuses.includes(status);
        if (!isValidStatus) {
            return res.send({
                success: 0,
                message: 'Not a valid status'
            })
        }
        if(status == 'Confirmed'){
            await generateTrackingID(orderId, productID)
        }
        const query = 'UPDATE order_item SET status = ? WHERE order_id = ? AND product_id = ?;'
        const values = [status, orderId, productID]
        const rows = await pool.query(query, values)
        if (rows.affectedRows == 1) {
            return res.send({
                success: 1,
                message: 'Order status updated'
            })
        }
        res.send({
            success: 0,
            message: 'Something went wrong'
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') })
    }
})


async function generateTrackingID(orderID, productID){
    try {
        const trackingID = cryptoRandomString({ length: 16, type: 'numeric' })
        const query = 'UPDATE order_item SET tracking_id = ? WHERE order_id = ? AND product_id = ?;'
        const values = [trackingID, orderID, productID]
        const status = await pool.query(query, values)
        return status.affectedRows
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


function getStatusFromSlug(slug) {
    let status = ''
    switch (slug) {
        case "new":
            status = 'Payment success'
            break
        case 'confirmed':
            status = 'Confirmed'
            break
        case 'dispatched':
            status = 'Dispatched'
            break
        case 'delivered':
            status = 'Delivered'
            break
        case 'return-requested':
            status = 'Return requested'
            break
        case 'returned':
            status = 'Returned'
            break
        case 'cancelled':
            status = 'Cancelled'
            break
        case 'all':
            status = 'All'
            break
    }
    return status
}


module.exports = router