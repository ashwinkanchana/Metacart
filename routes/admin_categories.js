const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { titleValidator } = require('../validators/admin_category')
const { pool } = require('../config/database')

// GET category index 
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT id, title, slug FROM category'
        const categories = await pool.query(query)
        res.render('admin/categories', { categories })
    } catch (error) {
        console.log(error)
    }
})

// GET add category
router.get('/add-category', (req, res) => {
    let title = ''
    res.render('admin/add_category', {
        title,
    })
})

// POST add new category
router.post('/add-category', titleValidator, async (req, res) => {
    try {
        const title = req.body.title
        const slug = title.replace(/\s+/g, '-').toLowerCase()
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            res.render('admin/add_category', { errors, title, })
        }
        else {
            const query = 'SELECT slug FROM category WHERE slug = ? LIMIT 1;'
            const filter = [slug]
            const count = await pool.query(query, filter)
            if (count.length > 0) {
                req.flash('red', 'Category already exists please use a different title')
                res.render('admin/add_category', { title })
            }
            else {
                const query = 'INSERT INTO category (title, slug) VALUES (?); SELECT id, title, slug FROM category;'
                const values = [[title, slug]]
                const insert = await pool.query(query, values)
                req.app.locals.categories = insert[1]
                req.flash('green', `Successfully added ${title}`)
                res.redirect('/admin/categories')
            }
        }
    } catch (error) {
        console.log(error)
    }
})

// GET edit category
router.get('/edit-category/:id', async (req, res) => {
    try {
        const query = 'SELECT id, title FROM category WHERE id = ?;'
        const filter = [req.params.id]
        const category = await pool.query(query, filter)
        res.render('admin/edit_category', {
            title: category[0].title,
            id: category[0].id
        })
    } catch (error) {
        console.log(error)
    }
})

// POST edit category
router.post('/edit-category/:id', titleValidator, async (req, res) => {
    try {
        const title = req.body.title
        const id = req.params.id
        let slug = title.replace(/\s+/g, '-').toLowerCase()
        const errors = validationResult(req).array();
        console.log(errors)
        if (errors.length > 0) {
            res.render('admin/edit_category', { errors, title, id })
        }
        else {
            const query = 'SELECT slug FROM category WHERE slug = ? AND id != ? LIMIT 1;'
            const filter = [slug, id]
            const count = await pool.query(query, filter)
            if (count.length > 0) {
                req.flash('red', 'Category already exists, Please use a different title')
                res.render('admin/edit_category', { title, id })
            }
            else {
                const query = 'UPDATE category SET title = ? , slug = ? WHERE id = ?; SELECT id, title, slug FROM category;'
                const updatedData = [title, slug, id]
                const categories = await pool.query(query, updatedData)
                req.app.locals.categories = categories[1]
                req.flash('green', `Successfully modified as ${title}`)
                res.redirect('/admin/categories')
            }
        }
    } catch (error) {
        console.log(error)
    }
})

// GET delete category
router.get('/delete-category/:id', async (req, res) => {
    try {
        const query = 'SELECT title FROM category WHERE id = ?; DELETE FROM category WHERE id = ?; SELECT id, title, slug FROM category;'
        const id = [req.params.id, req.params.id]
        const category = await pool.query(query, id)
        req.app.locals.categories = category[2]
        req.flash('grey darken-4', `Successfully deleted ${category[0][0].title}`)
        res.redirect('/admin/categories')
    } catch (error) {
        console.log(error)
    } 
})

module.exports = router