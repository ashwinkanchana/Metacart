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
    let category = ''

    Category.find(function (err, categories) {
        res.render('admin/add_product', {
            title,
            desc,
            categories,
            category,
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
                category,
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
                        category,
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
                    if (image != '') {
                        let productImage = req.files.image
                        const path = `public/product_images/${product._id}/${image}`
                        productImage.mv(path, (err) => {
                            if (err) {
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



// GET edit product
router.get('/edit-product/:id', (req, res) => {
    let errors;
    if (req.session.errors)
        errors = req.session.errors;
    req.session.errors = null;

    Category.find((err, categories) => {

        Product.findById(req.params.id, (err, product) => {
            if (err) {
                console.log(err);
                res.redirect('/admin/products')
            } else {
                const galleryDir = `public/product_images/${product._id}/gallery`
                let galleryImages = null;
                fs.readdir(galleryDir, (err, files) => {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        galleryImages = files

                        res.render('admin/edit_product', {
                            errors,
                            id: product._id,
                            title: product.title,
                            desc: product.desc,
                            price: parseFloat(product.price).toFixed(2),
                            image: product.image,
                            category: product.category.replace(/\s+/g, '-').toLowerCase(),
                            categories,
                            galleryImages
                        })
                    }
                })
            }
        })
    })
})

// POST edit product
router.post('/edit-product/:id', titleDescPriceImageValidator, (req, res) => {
    const id = req.params.id
    const image = req.body.image
    const title = req.body.title
    const desc = req.body.desc
    const price = req.body.price
    const category = req.body.category
    const pimage = req.body.pimage
    const slug = title.replace(/\s+/g, '-').toLowerCase()
    const errors = validationResult(req).array()
    if (errors.length > 0) {
        Category.find(function (err, categories) {
            req.session.errors = errors;
            res.redirect(`/admin/products/edit-product/${id}`)
        })
    } else {
        Product.findOne({
            slug,
            _id: { '$ne': id }
        }, function (err, p) {
            if (err)
                console.log(err)
            if (p) {
                Category.find(function (err, categories) {
                    req.flash('red', 'Product title exists, choose different title')
                    res.redirect(`admin/products/edit_product/${id}`)
                })
            } else {
                Product.findById(id, (err, p) => {
                    if (err) {
                        console.log(err)
                    }
                    p.title = title,
                        p.slug = slug,
                        p.desc = desc,
                        p.price = parseFloat(price).toFixed(2);
                    p.category = category
                    if (image != "") {
                        p.image = image
                    }
                    p.save(function (err) {
                        if (err) {
                            console.log(err)
                        }
                        if (image != "") {
                            if (pimage != "") {
                                fs.remove(`public/product_images/${id}/${pimage}`, function (err) {
                                    if (err) {
                                        console.log(err)
                                    }
                                })
                            }
                            let productImage = req.files.image
                            const path = `public/product_images/${id}/${image}`
                            productImage.mv(path, function (err) {
                                if (err) {
                                    return console.log(err)
                                }
                            })
                        }

                        req.flash('green', `Successfully modified ${p.title}`)
                        res.redirect(`/admin/products`)
                    })
                })
            }

        })

    }
})


// POST product gallery
router.post('/product-gallery/:id', (req, res) => {
    console.log("here")
    console.log(req.files)
    const productImage = req.files.file
    const id = req.params.id
    const path = `public/product_images/${id}/gallery/${req.files.file.name}`
    const thumbsPath = `public/product_images/${id}/gallery/thumbs/${req.files.file.name}`

    productImage.mv(path, (err) => {
        if (err){
            console.log(err)
            res.sendStatus(400);
        }
        resizeImg(fs.readFileSync(path),{
            width:200,
            height:150
        }).then(function(buf){
            fs.writeFileSync(thumbsPath,buf)
        })
    })
    res.sendStatus(200);
})

// GET delete product image
router.get('/delete-image/:image', (req, res) => {
    const id = req.query.id
    const img = req.params.image
    const originalImage = `public/product_images/${id}/gallery/${img}`
    const thumbImage = `public/product_images/${id}/gallery/thumbs/${img}`

    fs.remove(originalImage, function(err){
        if(err){
            console.log(err)
        }else{
            fs.remove(thumbImage, function(err){
                if(err){
                    console.log(err)
                }else{
                    req.flash('grey darken-4', `Successfully removed an image`)
                    res.redirect(`/admin/products/edit-product/${id}`)
                }
            })
        }
    })
})



// GET delete product
router.get('/delete-product/:id', (req, res) => {
    const id = req.params.id
    const path = `public/product_images/${id}`
    fs.remove(path, function(err){
        if(err){
            console.log(err)
        } else{
            Product.findByIdAndRemove(id, function(err, p){
                req.flash('grey darken-4', `Successfully removed a ${p.title}`)
                res.redirect(`/admin/products/`)    
            })
        }
    })
})



module.exports = router