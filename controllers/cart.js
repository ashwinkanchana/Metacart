const { pool } = require("../config/database")

exports.mergeCartOnLogin = async function (req, user, next) {
    //Merge new items added to cart before login and items saved in DB 
    try {
        let cart = req.session.cart
        if (cart && cart.length > 0) {
            let sessionCart = [[]]
            cart.forEach(cartItem => {
                sessionCart[0].push([user.id, cartItem.id, cartItem.quantity])
            })
            const query = 'INSERT INTO cart (user_id, product_id, quantity) VALUES ? ON DUPLICATE KEY UPDATE quantity = VALUES(quantity);'
            const mergeCart = await pool.query(query, sessionCart)
            console.log("merge cart")
            console.log(mergeCart)
        }
        let newCart = []
        const query = 'SELECT * FROM cart WHERE user_id = ?;'
        const userID = [user.id]
        const dbCart = await pool.query(query, userID)
        dbCart.forEach(cartItem => {
            newCart.push({
                id: cartItem.product_id,
                quantity: cartItem.quantity
            })
        })
        req.session.cart = newCart
        next(null, true)
    } catch (error) {
        console.log(error)
        next(error, false)
    }
},
    exports.updateCartDB = async function (req, query, next) {
        try {
            await pool.query(query)
            next(null, true)
        } catch (error) {
            console.log(error)
            next(error, false)
        }
    }
