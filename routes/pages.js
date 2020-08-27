const express = require('express')
const router = express.Router()

// GET pages index
router.get('/', (req, res) => {
    res.render('index', {
        title: 'Home'
    })
})



module.exports = router