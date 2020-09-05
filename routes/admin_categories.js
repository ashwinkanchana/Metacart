const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const Category = require('../models/category')

const { titleValidator } = require('../validators/admin_category')

// GET category index 
router.get('/', (req, res) => {
    Category.find(function (err, categories) {
        if (err) {
            return console.log(error)
        }
        res.render('admin/categories', {
            categories
        })
    })
})

// GET add category
router.get('/add-category', (req, res) => {
    let title = ''
    res.render('admin/add_category', {
        title,
    })
})


// POST add new category
router.post('/add-category', titleValidator, (req, res) => {
    const title = req.body.title
    const slug = title.replace(/\s+/g, '-').toLowerCase()
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('admin/add_category', {
            errors,
            title,
        })
    }
    else {
        Category.findOne({ slug }, function (err, category) {
            if (category) {
                req.flash('red', 'Category already exists please use a different title')
                res.render('admin/add_category', {
                    title,
                })
            } else {
                const category = new Category({
                    title,
                    slug,
                })

                category.save(function (err) {
                    if (err) {
                        return console.log(err)
                    }

                    Category.find({}).exec(function (err, categories) {
                        if (err) {
                            console.log(err)
                        } else {
                            req.app.locals.categories = categories
                        }
                    })

                    req.flash('green', `Successfully added ${title} category`)
                    res.redirect('/admin/categories')
                })
               
            }
        })
    }
})


// GET edit category
router.get('/edit-category/:id', (req, res) => {
    Category.findById(req.params.id, function (err, category) {
        if (err) {
            return console.log(err)
        }
        res.render('admin/edit_category', {
            title: category.title,
            id: category._id
        })
    })
})

// POST edit category
router.post('/edit-category/:id', titleValidator, (req, res) => {
    const title = req.body.title
    const id = req.params.id
    let slug = title.replace(/\s+/g, '-').toLowerCase()
    const errors = validationResult(req).array();
    console.log(errors)
    if (errors.length > 0) {
        res.render('admin/edit_category', {
            errors,
            title,
            id
        })
    }
    else {
        //$ne -> _id not eqauls id
        Category.findOne({ slug, _id: { '$ne': id } }, function (err, category) {
            if (category) {
                req.flash('red', 'Category already exists please add a different category')
                res.render('admin/edit_category', {
                    title,
                    id
                })
            } else {

                Category.findById(id, function (err, category) {
                    if (err) {
                        return console.log(err)
                    }
                    category.title = title
                    category.slug = slug

                    category.save(function (err) {
                        if (err) {
                            return console.log(err)
                        }

                        Category.find({}).exec(function (err, categories) {
                            if (err) {
                                console.log(err)
                            } else {
                                req.app.locals.categories = categories
                            }
                        })


                        req.flash('green', `Successfully modified as ${title}`)
                        res.redirect('/admin/categories')
                    })
                    
                })

            }
        })
    }
})


// GET delete category
router.get('/delete-category/:id', (req, res) => {
    Category.findByIdAndRemove(req.params.id, function (err, category) {
        if (err) {
            return console.log(err)
        }

        Category.find({}).exec(function (err, categories) {
            if (err) {
                console.log(err)
            } else {
                req.app.locals.categories = categories
            }
        })


        req.flash('grey darken-4', `Successfully deleted ${category.title}`)
        res.redirect('/admin/categories')
    })
})



module.exports = router