const express = require('express')
const AWS = require('aws-sdk')
const router = express.Router()
const mysql = require('mysql')
const { pool } = require('../config/database')
const moment = require('moment')
var _ = require('lodash');
const { isAuthenticated } = require('../controllers/auth')

const bucketName = process.env.AWS_BUCKET_NAME
//AWS s3 bucket for media storage
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
})

// GET all products
router.get('/', async (req, res) => {
    try {
        const startIndex = mysql.escape(parseInt(req.query.page - 1 || 0))
        const limit = mysql.escape(parseInt(req.query.limit || 12))
        const skip = startIndex * limit
        const filters = buildFiltersQuery(req)

        const query = `SELECT COUNT(*) AS count FROM(SELECT p.id FROM product p WHERE ${filters}) AS count; SELECT p.id, p.title, p.slug, p.price, p.image, p.stock, c.slug AS category FROM product p INNER JOIN category c ON p.category_id = c.id WHERE ${filters} LIMIT ${skip},${limit};`
        console.log("QUERY---->"+query);
        
        const products = await pool.query(query)
        const productsCount = products[0][0].count
        const numPages = Math.ceil(productsCount / limit);
        const reqQuery = req.query
        if (reqQuery.page)
            delete reqQuery.page
        if (reqQuery.limit)
            delete reqQuery.limit

        res.render('products', {
            reqQuery: new URLSearchParams(req.query).toString(),
            numPages,
            limit,
            currentPage: startIndex,
            title: 'Products',
            products: products[1]
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/products') })
    }
})

// GET products by category
router.get('/:category', async (req, res) => {
    try {
        const startIndex = mysql.escape(parseInt(req.query.page - 1 || 0))
        const limit = mysql.escape(parseInt(req.query.limit || 12))
        const skip = startIndex * limit

        const category = req.params.category
        const query = `SELECT product.id, product.title, product.slug, product.price, product.image, product.stock, category.slug AS category FROM product INNER JOIN category ON product.category_id = category.id WHERE category.slug = ? LIMIT ${skip},${limit}; SELECT title FROM category WHERE slug = ?; SELECT COUNT(*) AS count FROM(SELECT p.id FROM product p INNER JOIN category c ON p.category_id = c.id WHERE c.slug = ?) AS count;`
        const filter = [category, category, category]
        const products = await pool.query(query, filter)
        const productsCount = products[2][0].count
        console.log("QUERY---->"+query);
        
        const numPages = Math.ceil(productsCount / limit);
        if (products[1].length > 0) {
            res.render('products', {
                category:`${category}`,
                reqQuery: '',
                numPages,
                limit,
                currentPage: startIndex,
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
        //const relatedProducts = await pool.query(relatedProductsQuery)
        
        const reviews = await getProductReviews(req, productSlug)

        if (product) {
            const galleryDir = `product_images/${product.id}/gallery/`
            var params = {
                Bucket: bucketName,
                Delimiter: '/',
                Prefix: galleryDir
            }

            // s3.listObjects(params, function (err, files) {
            //     if (err)
            //         throw new Error(err)
            //     galleryImages = files.Contents.map(a => a.Key);
            //     galleryImages.forEach((a, index) => {
            //         let pos = a.lastIndexOf('/')
            //         galleryImages[index] = a.substring(pos + 1, a.length)
            //     });
                res.render('product', {
                    title: product.title,
                    p: product,
                    galleryImages: [],
                    relatedProducts: [],
                    reviews
                })
            //})
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


function buildFiltersQuery(req) {
    try {
        let filters = ''
        const query = req.query
        let category = mysql.escape(parseInt(query.category))
        if (isNaN(category))
            category = 0
        const priceMin = mysql.escape(parseInt(query.pricemin) || 1)
        const priceMax = mysql.escape(parseInt(query.pricemax) || 9999999)
        const includeOutOfStock = query.stock == 'on' || false
        const filter2 = `p.price BETWEEN ${priceMin} AND ${priceMax}`
        let filter3 = ''
        if (includeOutOfStock) {
            filter3 = `p.stock >= 0`
        } else {
            filter3 = `p.stock > 0`
        }
        let filter4 = 'init'
        switch (query.sort) {
            case 'popularity':
                filter4 = 'ORDER BY p.sales';
                break;
            case 'low-to-high':
                filter4 = 'ORDER BY p.price';
                break;
            case 'high-to-low':
                filter4 = 'ORDER BY p.price DESC';
                break;
            default:
                filter4 = 'relevance';
        }
        
        if(category != 0){
            const filter1 = `p.category_id = ${category}`
            filters += ` ${filter1} AND`
        }
        filters += ` ${filter2} AND ${filter3}`
        if (filter4 != 'relevance')
            filters += ` ${filter4}`
        return filters
    } catch (error) {
        console.log(error);
        throw new Error(error)
    }
}




async function getProductReviews(req, productSlug){
    let reviews = {}
    let currentUserReview = null
    const allReviewQuery = `SELECT r.*, u.fullname FROM reviews r INNER JOIN product p ON r.product_id = p.id INNER JOIN user u ON r.user_id = u.id WHERE p.slug = ${mysql.escape(productSlug)};`
    const allReviews = await pool.query(allReviewQuery)
    let totalReviews = 0
    let sum = 0
    for(let i = allReviews.length-1; i >=0 ; i--){ 
        sum += allReviews[i].rating
        totalReviews += +1
        allReviews[i].created_at = moment(allReviews[i].created_at).utcOffset("+05:30").format('MMM Do YYYY')
        if(isAuthenticated(req)){
            if(allReviews[i].user_id == req.user.id){
                currentUserReview = allReviews[i]
                allReviews.splice(i,1);
            }
        }
        
    }
    reviews.count = totalReviews
    reviews.avg = parseFloat(sum/totalReviews).toFixed(1)
    reviews.user = currentUserReview
    reviews.reviews = allReviews
    if(!(Array.isArray(reviews.reviews) && reviews.reviews.length)){
        delete reviews.reviews
    }
    if(_.isEmpty(((reviews || {}).user || {})) ){
        reviews.user = {}
        reviews.user.rating = 0
    }
    console.log(reviews);
    
    return reviews
}
module.exports = router



