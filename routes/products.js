const express = require('express')
const fs = require('fs-extra')
const router = express.Router()
const Product = require('../models/product')
const Category = require('../models/category')



// GET all products
router.get('/', (req, res) => {
    Product.find((err, products) => {
        if (err)
            console.log(err)
        res.render('products', {
            title: 'All products',
            products
        })
    })
})



// GET products by category
router.get('/:category', (req, res) => {
    const category = req.params.category
    Category.findOne({ slug: category }).exec()
    .then(cat => {
        Product.find({ category: category }, function (err, products) {
            if (err)
                console.log(err)
            res.render('products', {
                title: cat.title,
                products
            })
        })
    })
    .catch(err => console.log(err))
})




// GET product details
router.get('/:category/:product', (req, res) => {
    const category = req.params.category
    const product = req.params.product
    let galleryImages = null

    Product.findOne({ slug: product }, (err, p) => {
        if (err)
            console.log(err)
        else if (p) {
            const galleryDir = `public/product_images/${p._id}/gallery`

            fs.readdir(galleryDir, (err, files) => {
                if (err) {
                    console.log(err)
                } else {
                    galleryImages = files
                    res.render('product', {
                        title: p.title,
                        p,
                        galleryImages
                    })
                }
            })
        }

    })
})


module.exports = router