const express = require('express')
const router = express.Router()
const Page = require('../models/page')


// GET pages index
router.get('/', (req, res) => {
    const pages = req.app.locals.pages
    Page.findOne({ slug: 'home' }, (err, page) => {
        if (err)
            console.log(err)
        res.render('index', {
            pages,
            title: page.title,
            content: page.content,
        })
    })
})


// GET page
router.get('/:slug', (req, res) => {
    const slug = req.params.slug
    const pages = req.app.locals.pages
    Page.findOne({ slug }, (err, page) => {
        if (err)
            console.log(err)
        if (page) {
            res.render('index', {
                title: page.title,
                content: page.content,
                pages
            })
        } else {
            res.status(404).render('./errors/404')
        }
    })
})


module.exports = router