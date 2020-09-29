const express = require('express')
const { validationResult } = require('express-validator')
const mkdirp = require('mkdirp')
const fs = require('fs-extra')
const resizeImg = require('resize-img')
const router = express.Router()
const { titleDescPriceImageValidator } = require('../validators/admin_product')
const { pool } = require('../config/database')

// GET products index
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT product.id, category.title AS `category`, product.title, product.price, product.image FROM product INNER JOIN category ON product.category_id = category.id;'
        const products = await pool.query(query)
        res.render('admin/products', {
            products: products,
            count: products.length
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
        const image = req.body.image
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
                var priceNumber = parseFloat(price).toFixed(2)
                const newProduct = [[title, slug, desc, priceNumber, category, image], slug]
                const query = 'INSERT INTO product (title, slug, specs, price, category_id, image) VALUES (?); SELECT id, title FROM product WHERE slug = ? ;'
                const insert = await pool.query(query, newProduct)
                const insertedProduct = insert[1][0]
                mkdirp.sync(`/public/product_images/${insertedProduct.id}`)
                mkdirp.sync(`public/product_images/${insertedProduct.id}/gallery`)
                mkdirp.sync(`public/product_images/${insertedProduct.id}/gallery/thumbs`)
                if (image != '') {
                    let productImage = req.files.image
                    const path = `public/product_images/${insertedProduct.id}/${image}`
                    productImage.mv(path, (err) => {
                        if (err) {
                            return console.log(err)
                        }
                        req.flash('green', `Successfully added ${insertedProduct.title}`)
                        req.session.save(() => { res.redirect('/admin/products') }) 
                    })
                } else {
                    req.flash('green', `Successfully added ${insertedProduct.title}`)
                    req.session.save(() => { res.redirect('/admin/products') }) 
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
        console.log(product)
        const galleryDir = `public/product_images/${product.id}/gallery`
        let galleryImages = null;
        fs.readdir(galleryDir, (err, files) => {
            if (err) {
                console.log(err)
            }
            else {
                galleryImages = files
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
            }
        })
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/admin/products') }) 
    }
})

// POST edit product
router.post('/edit-product/:id', titleDescPriceImageValidator, async (req, res) => {
    try {
        const id = req.params.id
        const image = req.body.image
        const title = req.body.title
        const desc = req.body.desc
        const price = parseFloat(req.body.price).toFixed(2)
        const category = req.body.category
        const stock = req.body.stock
        const pimage = req.body.pimage
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
            console.log(count)
            if (count.length > 0) {
                req.flash('red', 'Product title already exists, choose a different title')
                req.session.save(() => { res.redirect(`admin/products/edit_product/${id}`) }) 
            } else {
                //new image is uploaded
                if (image != "") {
                    const query = 'UPDATE product SET title = ?, slug = ?,specs = ?, price=?, image = ?, stock=?, category_id=? WHERE id = ?;'
                    const values = [title, slug, desc, price, image, stock, category, id]
                    const update = await pool.query(query, values)

                    //if previous image existed remove it
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
                        req.flash('green', `Successfully modified ${title}`)
                        req.session.save(() => { res.redirect(`/admin/products`) }) 
                    })
                } else {
                    const query = 'UPDATE product SET title = ?, slug = ?,specs = ?, price=?, stock=?, category_id=? WHERE id = ?;'
                    const values = [title, slug, desc, price, stock, category, id]
                    const update = await pool.query(query, values)
                    req.flash('green', `Successfully modified ${title}`)
                    req.session.save(() => { res.redirect(`/admin/products`) }) 
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
    const productImage = req.files.file
    const id = req.params.id
    const path = `public/product_images/${id}/gallery/${req.files.file.name}`
    const thumbsPath = `public/product_images/${id}/gallery/thumbs/${req.files.file.name}`
    productImage.mv(path, (err) => {
        if (err) {
            console.log(err)
            res.sendStatus(400);
        }
        resizeImg(fs.readFileSync(path), {
            width: 200,
        }).then(function (buf) {
            fs.writeFileSync(thumbsPath, buf)
            res.sendStatus(200);
        }).catch(err =>
            console.log(err))
    })
})

// GET delete product image
router.get('/delete-image/:image', (req, res) => {
    const id = req.query.id
    const img = req.params.image
    const originalImage = `public/product_images/${id}/gallery/${img}`
    const thumbImage = `public/product_images/${id}/gallery/thumbs/${img}`

    fs.remove(originalImage, function (err) {
        if (err) {
            console.log(err)
        } else {
            fs.remove(thumbImage, function (err) {
                if (err) {
                    console.log(err)
                } else {
                    req.flash('grey darken-4', `Successfully removed an image`)
                    req.session.save(() => { res.redirect(`/admin/products/edit-product/${id}`) })    
                }
            })
        }
    })
})

// GET delete product
router.get('/delete-product/:id', (req, res) => {
    const id = req.params.id
    const path = `public/product_images/${id}`
    fs.remove(path, async (err)=> {
        if (err) {
            console.log(err)
        } else {
            const query = 'SELECT title FROM product WHERE id = ?; DELETE FROM product WHERE id = ?;'
            const filter = [id, id]
            const product = await pool.query(query, filter)
            req.flash('grey darken-4', `Successfully removed a ${product[0][0].title}`)
            req.session.save(() => { res.redirect(`/admin/products/`) })  
        }
    })
})

module.exports = router

