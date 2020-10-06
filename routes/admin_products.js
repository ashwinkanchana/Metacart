const express = require('express')
const { validationResult } = require('express-validator')
const nodePath = require('path')
const mysql = require('mysql')
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk')
const resizeImg = require('resize-img')
const router = express.Router()
const { titleDescPriceImageValidator } = require('../validators/admin_product')
const { pool } = require('../config/database')

const bucketName = process.env.AWS_BUCKET_NAME

//AWS s3 bucket for media storage
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET
})


// GET products page
router.get('/', async (req, res) => {
    try {
        const categories = req.app.locals.categories
        console.log(categories);
        res.render('admin/products', {
            categories,
            products: [],
            selected: 0
        })
    } catch (error) {
        console.log(error)
    }
})

// GET products of a category
router.get('/list/:category', async (req, res) => {
    try {
        const categories = req.app.locals.categories
        const query = `SELECT product.id, category.title AS \`category\`, product.title, product.price, product.image FROM product INNER JOIN category ON product.category_id = category.id WHERE category.slug = ${mysql.escape(req.params.category)} OR  category.id = ${mysql.escape(req.params.category)};`
        const products = await pool.query(query)
        res.render('admin/products', {
            products: products,
            categories,
            selected: categories
        })
    } catch (error) {
        console.log(error)
    }
})

// GET add products
router.get('/add-product', async (req, res) => {
    try {
        let title = '', desc = '', price = '', category = ''
        const categories = req.app.locals.categories
        res.render('admin/add_product', {
            title, desc, categories, category, price
        })
    } catch (error) {
        console.log(error)
    }
})

// POST add product
router.post('/add-product', titleDescPriceImageValidator, async (req, res) => {
    try {
        let imageExtension = null
        const imageName = req.body.image
        let imageID = 'thumbs'
        if (imageName.length > 0)
            imageExtension = nodePath.extname(imageName)
        const title = req.body.title
        const desc = req.body.desc
        const price = req.body.price
        const category = req.body.category
        const slug = title.replace(/\s+/g, '-').toLowerCase()
        const errors = validationResult(req).array();
        const categories = req.app.locals.categories
        if (errors.length > 0) {
            res.render('admin/add_product', { errors, title, desc, categories, category, price })
        }
        else {
            const query = 'SELECT title FROM product WHERE title = ? LIMIT 1;'
            const filter = [title]
            const count = await pool.query(query, filter)
            if (count.length > 0) {
                req.flash('red', 'Product title already exists, please use a different title')
                req.session.save(() => { res.render('admin/add_product', { title, desc, categories, category, price }) })
            }
            else {
                if (imageExtension)
                    imageID = imageID + `${imageExtension}`
                var priceNumber = parseFloat(price).toFixed(2)
                const newProduct = [[title, slug, desc, priceNumber, category, imageID], slug]
                const query = 'INSERT INTO product (title, slug, specs, price, category_id, image) VALUES (?); SELECT id, title FROM product WHERE slug = ? ;'
                const insert = await pool.query(query, newProduct)
                const insertedProduct = insert[1][0]
                if (imageExtension) {
                    let productImage = req.files.image.data
                    const imageKey = `product_images/${insertedProduct.id}/${imageID}`
                    const params = {
                        Bucket: bucketName,
                        Key: imageKey,
                        Body: productImage
                    }
                    s3.upload(params, async (error, data) => {
                        if (error) {
                            throw new Error(error)
                        }
                        await updateSearchTerms(req)
                        req.flash('green', `Successfully added ${insertedProduct.title}`)
                        req.session.save(() => { res.redirect(`/admin/products/list/${category}`) })
                    })
                } else {
                    await updateSearchTerms(req)
                    req.flash('green', `Successfully added ${insertedProduct.title}`)
                    req.session.save(() => { res.redirect(`/admin/products/list/${category}`) })
                }
            }
        }
    } catch (error) {
        console.log(error)
        req.flash('res', `Something went wrong!`)
        req.session.save(() => { res.redirect('/admin/products') })
    }
})

// GET edit product
router.get('/edit-product/:id', async (req, res) => {
    try {
        let errors;
        if (req.session.errors)
            errors = req.session.errors;
        req.session.errors = null;

        const categories = req.app.locals.categories
        const query = 'SELECT * FROM product WHERE id = ? LIMIT 1;'
        const filter = [req.params.id]
        let product = await pool.query(query, filter)
        product = product[0]
        const galleryDir = `./public/product_images/${product.id}/gallery`
        let galleryImages = null;
        var params = {
            Bucket: bucketName,
            Delimiter: '/',
            Prefix: `product_images/${product.id}/gallery/`
        }

        s3.listObjects(params, function (err, files) {
            if (err)
                throw err;
            galleryImages = files.Contents.map(a => a.Key);
            galleryImages.forEach((a, index) => {
                let pos = a.lastIndexOf('/')
                galleryImages[index] = a.substring(pos + 1, a.length)
            });

            res.render('admin/edit_product', {
                errors,
                id: product.id,
                title: product.title,
                desc: product.specs,
                price: parseFloat(product.price).toFixed(2),
                image: product.image,
                category: product.category_id,
                stock: product.stock,
                categories,
                galleryImages
            })
        });
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/admin/products') })
    }
})

// POST edit product
router.post('/edit-product/:id', titleDescPriceImageValidator, async (req, res) => {
    try {
        let imageExtension
        const id = req.params.id
        const image = req.body.image
        const title = req.body.title
        const desc = req.body.desc
        const price = parseFloat(req.body.price).toFixed(2)
        const category = req.body.category
        const stock = req.body.stock
        const pimage = req.body.pimage
        if (image != '')
            imageExtension = nodePath.extname(image)
        const slug = title.replace(/\s+/g, '-').toLowerCase()
        const categories = req.app.locals.categories
        const errors = validationResult(req).array()
        if (errors.length > 0) {
            req.session.errors = errors;
            res.redirect(`/admin/products/edit-product/${id}`)
        } else {
            const query = 'SELECT slug FROM product WHERE slug = ? AND id != ? LIMIT 1;'
            const filter = [slug, id]
            const count = await pool.query(query, filter)
            if (count.length > 0) {
                req.flash('red', 'Product title already exists, choose a different title')
                req.session.save(() => { res.redirect(`admin/products/edit_product/${id}`) })
            } else {
                //new image is uploaded
                if (image != "") {
                    const query = 'UPDATE product SET title = ?, slug = ?,specs = ?, price=?, image = ?, stock=?, category_id=? WHERE id = ?;'
                    const values = [title, slug, desc, price, `thumbs${imageExtension}`, stock, category, id]
                    const update = await pool.query(query, values)

                    //if previous image existed remove it
                    if (pimage != "") {
                        const previousImage = `product_images/${id}/${pimage}`
                        var deleteParams = { Bucket: bucketName, Key: previousImage };
                        s3.deleteObject(deleteParams, (err, data) => {
                            if (err)
                                throw new Error(err)
                        });
                    }
                    let productImage = req.files.image.data
                    const imageKey = `product_images/${id}/thumbs${imageExtension}`
                    const params = {
                        Bucket: bucketName,
                        Key: imageKey,
                        Body: productImage
                    }
                    s3.upload(params, (error, data) => {
                        if (error) {
                            throw new Error(error)
                        }
                    })
                    req.flash('green', `Successfully modified ${title}`)
                    req.session.save(() => { res.redirect(`/admin/products/list/${category}`) })
                } else {
                    const query = 'UPDATE product SET title = ?, slug = ?,specs = ?, price=?, stock=?, category_id=? WHERE id = ?;'
                    const values = [title, slug, desc, price, stock, category, id]
                    const update = await pool.query(query, values)
                    await updateSearchTerms(req)
                    req.flash('green', `Successfully modified ${title}`)
                    req.session.save(() => { res.redirect(`/admin/products/list/${category}`) })
                }
            }
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/admin/products') })
    }
})

// POST product gallery
router.post('/product-gallery/:id', (req, res) => {
    const productImage = req.files.file.data
    const id = req.params.id
    const imageExtension = nodePath.extname(req.files.file.name)
    const imageID = uuidv4()
    const imageKey = `product_images/${id}/gallery/${imageID}${imageExtension}`
    const thumbKey = `product_images/${id}/gallery/thumbs/${imageID}${imageExtension}`

    const imageParams = { Bucket: bucketName, Key: imageKey, Body: productImage }
    s3.upload(imageParams, (error, data) => {
        if (error)
            throw new Error(error)
    })
    resizeImg(req.files.file.data, {
        width: 200,
    }).then(function (buf) {
        const thumbParams = { Bucket: bucketName, Key: thumbKey, Body: buf }
        s3.upload(thumbParams, (error, data) => {
            if (error)
                throw new Error(error)
        })
        res.sendStatus(200);
    }).catch((err) => {
        console.log(err)
        res.sendStatus(400)
    })
})

// GET delete product image
router.get('/delete-image/:image/:id', (req, res) => {
    try {
        const id = req.params.id
        const img = req.params.image
        const originalImage = `product_images/${id}/gallery/${img}`
        const thumbImage = `product_images/${id}/gallery/thumbs/${img}`
        var deleteParams1 = { Bucket: bucketName, Key: originalImage }
        s3.deleteObject(deleteParams1, (err, data) => {
            if (err)
                throw new Error(err)
            var deleteParams2 = { Bucket: bucketName, Key: thumbImage }
            s3.deleteObject(deleteParams2, (err, data) => {
                if (err)
                    throw new Error(err)
                req.flash('grey darken-4', `Successfully removed an image`)
                req.session.save(() => { res.redirect(`/admin/products/edit-product/${id}`) })
            })
        });
    } catch (error) {
        console.log(error);
        req.flash('grey darken-4', `Something went wrong`)
        req.session.save(() => { res.redirect(`/admin/products`) })
    }
})

// GET delete product
router.get('/delete-product/:id', async (req, res) => {
    try {
        const id = req.params.id
        await deleteS3Directory(`product_images/${id}/`)
        const query = 'SELECT title, category_id FROM product WHERE id = ?; DELETE FROM product WHERE id = ?;'
        const filter = [id, id]
        const product = await pool.query(query, filter)
        await updateSearchTerms(req)
        req.flash('grey darken-4', `Successfully removed a ${product[0][0].title}`)
        req.session.save(() => { res.redirect(`/admin/products/list/${product[0][0].category_id}`) })
    } catch (error) {
        console.log(error);
        req.flash('grey darken-4', `Something went wrong`)
        req.session.save(() => { res.redirect(`/admin/products`) })
    }
})

//Delete given directory from S3
async function deleteS3Directory(dir) {
    try {
        const bucket = bucketName
        const listParams = {
            Bucket: bucket,
            Prefix: dir
        };
        const listedObjects = await s3.listObjectsV2(listParams).promise();
        if (listedObjects.Contents.length === 0) return;
        const deleteParams = {
            Bucket: bucket,
            Delete: { Objects: [] }
        };
        listedObjects.Contents.forEach(({ Key }) => {
            deleteParams.Delete.Objects.push({ Key });
        });
        await s3.deleteObjects(deleteParams).promise();
        if (listedObjects.IsTruncated) await deleteS3Directory(bucket, dir);
    } catch (error) {
        throw new Error(error)
    }
}


async function updateSearchTerms(req) {
    const searchTermsQuery = 'SELECT id, title, image FROM product;'
    try {
        const products = await pool.query(searchTermsQuery)
        let searchTerms = {}
        products.forEach(p => {
            searchTerms[`${p.title}`] = `https://ecommerce-metacart.s3.ap-south-1.amazonaws.com/product_images/${p.id}/${p.image}`
        });
        req.app.locals.searchTerms = searchTerms
    } catch (error) {
        console.log(error)
        throw new Error(error)
    }
}


module.exports = router