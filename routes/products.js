const express = require('express')
const AWS = require('aws-sdk')
const router = express.Router()
const { pool } = require('../config/database')

const bucketName = process.env.AWS_BUCKET_NAME

//AWS s3 bucket for media storage
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
})

// GET all products
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id;'
        const products = await pool.query(query)
        res.render('products', {
            title: 'All products',
            products
        })
    } catch (error) {
        console.log(error)
    }
})

// GET products by category
router.get('/:category', async (req, res) => {
    try {
        const category = req.params.category
        const query = 'SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE category.slug = ?; SELECT title FROM category WHERE slug = ?;'
        const filter = [category, category]
        const products = await pool.query(query, filter)
        if (products[1].length > 0) {
            res.render('products', {
                title: products[1][0].title,
                products: products[0]
            })
        } else {
            req.flash('grey darken-4', 'Category doesn\'t exists')
            req.session.save(() => { res.redirect('/products') })
        }

    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/products') })
    }
})

// GET product details
router.get('/:category/:product', async (req, res) => {
    try {
        const category = req.params.category
        const productSlug = req.params.product
        let galleryImages = null
        const query = 'SELECT * from product WHERE slug = ?'
        const filter = [productSlug]
        const product = (await pool.query(query, filter))[0]

        const relatedProductsQuery = `SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, c.slug AS category FROM product INNER JOIN category c ON product.category_id = c.id WHERE c.slug = '${category}' ORDER BY RAND() LIMIT 8;`
        const relatedProducts = await pool.query(relatedProductsQuery)
        console.log(relatedProducts);
        
        if (product) {
            const galleryDir = `product_images/${product.id}/gallery/`

            var params = {
                Bucket: bucketName,
                Delimiter: '/',
                Prefix: galleryDir
            }

            s3.listObjects(params, function (err, files) {
                if (err)
                    throw new Error(err)
                galleryImages = files.Contents.map(a => a.Key);
                galleryImages.forEach((a, index) => {
                    let pos = a.lastIndexOf('/')
                    galleryImages[index] = a.substring(pos+1,a.length)
                });
                res.render('product', {
                    title: product.title,
                    p: product,
                    galleryImages,
                    relatedProducts
                })
            })
        } else {
            req.flash('grey darken-4', 'Product doesn\'t exists')
            req.session.save(() => { res.redirect('/products') })
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/products') })
    }
})

module.exports = router