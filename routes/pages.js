const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')

// GET home page
router.get('/', async (req, res) => {
    //try {
    //     const pages = req.app.locals.pages
    //     const query = 'SELECT * FROM page WHERE slug = "home";'
    //     const homepage = (await pool.query(query))[0]
    //     if (homepage) {
    //         res.render('index', {
    //             pages,
    //             title: 'Metacart',
    //             content: homepage.content,
    //         })
    //     } else {
    //         req.flash('grey darken-4', 'Page doesn\'t exists')
    //         res.status(404).render('./errors/404')
    //         res.redirect('/')
    //     }    
    // } catch (error) {
    //     console.log(error)
    //     req.flash('red', 'Something went wrong!')
    //     res.redirect('/')
    // }
    res.render('home')
})

// GET page
router.get('/:slug', async (req, res) => {
    try {
        const pages = req.app.locals.pages
        const query = 'SELECT * FROM page WHERE slug = ?;'
        const filter = [req.params.slug]
        const page = (await pool.query(query, filter))[0]
        if (page) {
            res.render('index', {
                pages,
                title: page.title,
                content: page.content,
            })
        } else {
            req.flash('grey darken-4', 'Page doesn\'t exists')
            req.session.save(() => { res.status(404).render('./errors/404') }) 
        }
    } catch (error) {
        console.log(error)
        req.flash('red', 'Something went wrong!')
        req.session.save(() => { res.redirect('/') }) 
    }
})

module.exports = router