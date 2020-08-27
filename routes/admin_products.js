const express = require('express')
const { check, body, validationResult } = require('express-validator')
const mkdirp = require('mkdirp')
const fs = require('fs-extra')
const resizeImg = require('resize-img')
const router = express.Router()
const Product = require('../models/product')
const Category = require('../models/category')
const { titleDescPriceImageValidator } = require('../validators/admin_product')


// GET products index
router.get('/', (req, res) => {
    let count;
    Product.countDocuments(function (err, c) {
        count = c
    })
    Product.find(function (err, products) {
        res.render('admin/products', {
            products,
            count
        })
    })
})

// GET add products
router.get('/add-product', (req, res) => {
    let title = ''
    let desc = ''
    let price = ''

    Category.find(function (err, categories) {
        res.render('admin/add_product', {
            title,
            desc,
            categories,
            price
        })
    })
})


// POST add product
router.post('/add-product', titleDescPriceImageValidator, (req, res) => {
  
    const image = req.body.image
    const title = req.body.title
    const desc = req.body.desc
    const price = req.body.price
    const category = req.body.category
    const slug = title.replace(/\s+/g, '-').toLowerCase()

    const errors = validationResult(req).array();
    if (errors.length > 0) {
        Category.find(function (err, categories) {
            res.render('admin/add_product', {
                errors,
                title,
                desc,
                categories,
                price
            })
        })
    }
    else {
        Product.findOne({ slug }, function (err, product) {
            if (product) {
                req.flash('red', 'Product title exists please use a different name')
                Category.find(function (err, categories) {
                    res.render('admin/add_product', {
                        title,
                        desc,
                        categories,
                        price
                    })
                })
            } else {
                var priceNumber = parseFloat(price).toFixed(2)
                const product = new Product({
                    title,
                    slug,
                    desc,
                    price: priceNumber,
                    category,
                    image
                })

                product.save(function (err) {
                    if (err) {
                        return console.log(err)
                    }
                    mkdirp.sync(`/public/product_images/${product._id}`)
                    mkdirp.sync(`public/product_images/${product._id}/gallery`)
                    mkdirp.sync(`public/product_images/${product._id}/gallery/thumbs`)
                    if(image != ''){
                        let productImage = req.files.image
                        const path = `public/product_images/${product._id}/${image}`
                        productImage.mv(path, (err)=>{
                            if(err){
                                return console.log(err)
                            }
                        })
                    }
                    req.flash('green', `Successfully added ${product.title}`)
                    res.redirect('/admin/products')
                })
                
            }
        })
    }
})



// POST reorder pages
router.post('/reorder-pages', (req, res) => {
    const ids = req.body['id[]']
    let count = 0;
    for (let i = 0; i < ids.length; i++) {
        let id = ids[i]
        count++;
        //Updating DB inside closure becouse Node is asynchronous
        (function (count) {
            Page.findById(id, function (err, page) {
                page.sorting = count;
                page.save(function (err) {
                    if (err) {
                        console.log(err)
                    }
                })
            })
        })(count)
    }
})

// GET edit page
router.get('/edit-page/:id', (req, res) => {
    Page.findById(req.params.id, function (err, page) {
        if (err) {
            return console.log(err)
        }
        res.render('admin/edit_page', {
            title: page.title,
            slug: page.slug,
            content: page.content,
            id: page._id
        })
    })
})

// POST edit page
router.post('/edit-page/:id', [
    check('title', 'Title is required').trim().not().isEmpty(),
    check('content', 'Content is required').trim().not().isEmpty()
], (req, res) => {
    const title = req.body.title
    const content = req.body.content
    const id = req.params.id
    let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase()
    if (slug == "")
        slug = title.replace(/\s+/g, '-').toLowerCase()
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        console.log('errors')
        res.render('admin/edit_page', {
            errors,
            title,
            slug,
            content,
            id
        })
    }
    else {
        console.log('no errors')
        //$ne -> _id not eqauls id
        Page.findOne({ slug, _id: { '$ne': id } }, function (err, page) {
            if (page) {
                req.flash('red', 'Page slug exists please use a different slug')
                res.render('admin/edit_page', {
                    title,
                    slug,
                    content,
                    id
                })
            } else {

                Page.findById(id, function (err, page) {
                    if (err) {
                        return console.log(err)
                    }
                    page.title = title
                    page.slug = slug
                    page.content = content

                    page.save(function (err) {
                        if (err) {
                            return console.log(err)
                        }
                    })
                    req.flash('green', `Successfully modified ${title} page`)
                    res.redirect('/admin/pages/')
                })

            }
        })
    }
})


// GET delete page
router.get('/delete-page/:id', (req, res) => {
    Page.findByIdAndRemove(req.params.id, function (err, page) {
        if (err) {
            return console.log(err)
        }
        req.flash('grey darken-4', `Successfully deleted ${page.title} page`)
        res.redirect('/admin/pages')
    })
})



module.exports = router