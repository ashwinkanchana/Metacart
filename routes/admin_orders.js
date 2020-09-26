const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')

// GET category index 
router.get('/', async (req, res) => {
    try {
        res.render('admin/orders')
    } catch (error) {
        console.log(error)
    }
})

module.exports = router