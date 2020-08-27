const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const Page = require('../models/page')
const { titleContentValidator } = require('../validators/admin_page')

// GET pages index 
router.get('/', (req, res) => {
    Page.find({}).sort({ sorting: 1 }).exec(function (err, pages) {
        res.render('admin/pages', {
            pages
        })
    })
})

// GET add page
router.get('/add-page', (req, res) => {
    let title = ''
    let slug = ''
    let content = ''
    res.render('admin/add_page', {
        title,
        slug,
        content
    })
})


// POST add new page
router.post('/add-page', titleContentValidator, (req, res) => {
    const title = req.body.title
    const content = req.body.content
    let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase()
    if (slug == "")
        slug = title.replace(/\s+/g, '-').toLowerCase()
    const errors = validationResult(req).array();
    if (errors.length > 0) {
        res.render('admin/add_page', {
            errors,
            title,
            slug,
            content
        })
    }
    else {
        Page.findOne({ slug }, function (err, page) {
            if (page) {
                req.flash('red', 'Page slug exists please use a different slug')
                res.render('admin/add_page', {
                    title,
                    slug,
                    content
                })
            } else {
                const page = new Page({
                    title,
                    slug,
                    content,
                    sorting: 100
                })

                page.save(function (err) {
                    if (err) {
                        return console.log(err)
                    }
                })
                req.flash('green', `Successfully added ${title} page`)
                res.redirect('/admin/pages')
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
router.post('/edit-page/:id', titleContentValidator, (req, res) => {
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
                    res.redirect('/admin/pages/' )
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