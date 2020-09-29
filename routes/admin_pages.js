const express = require('express')
const { check, validationResult } = require('express-validator')
const router = express.Router()
const { pool } = require('../config/database')
const { titleContentValidator } = require('../validators/admin_page')

// GET pages index 
router.get('/', async (req, res) => {
    try {
        const query = 'SELECT id, title, slug FROM page ORDER BY sorting;'
        const pages = await pool.query(query)
        res.render('admin/pages', { pages })
    } catch (error) {
        console.log(error)
    }
})

// GET add page
router.get('/add-page', (req, res) => {
    let title = '', slug = '', content = ''
    res.render('admin/add_page', {
        title, slug, content
    })
})

// POST add new page
router.post('/add-page', titleContentValidator, async (req, res) => {
    try {
        const title = req.body.title
        const content = req.body.content
        let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase()
        if (slug == "")
            slug = title.replace(/\s+/g, '-').toLowerCase()
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            res.render('admin/add_page', { errors, title, slug, content })
        }
        else {
            const query = 'SELECT * FROM page WHERE slug=? LIMIT 1'
            const page = await pool.query(query, [slug])
            if (page.length > 0) {
                //slug in use
                req.flash('red', 'Page slug exists please use a different slug')
                req.session.save(() => { res.render('admin/add_page', { title, slug, content }) })
            } else {
                const insertAndGetAllPage = 'INSERT INTO page (title, slug, content, sorting) VALUES (?); SELECT id, title, slug FROM page ORDER BY sorting;'
                const pages = await pool.query(insertAndGetAllPage, [[title, slug, content, 100]])
                /*Defalut sorting ->100*/
                req.app.locals.pages = pages[1]
                req.flash('green', `Successfully added ${title} page`)
                req.session.save(() => { res.redirect('/admin/pages') })
            }
        }
    } catch (error) {
        console.log(error)
    }
})

//Sort pages function
function sortPages(ids, callback) {
    try {
        let count = 0;
        for (let i = 0; i < ids.length; i++) {
            let id = ids[i]
            count++;
            //Updating DB inside closure becouse Node is asynchronous
            (async (count) => {
                const updateSortOrder = 'UPDATE page SET sorting = ? where id = ?;'
                const values = [count, id]
                await pool.query(updateSortOrder, values);
                ++count
                if (count >= ids.length) {
                    callback()
                }
            })(count)
        }
    } catch (error) {
        console.log(error)
    }
}

// POST reorder pages
router.post('/reorder-pages', (req, res) => {
    try {
        const ids = req.body['id']
        sortPages(ids, async () => {
            const query = 'SELECT id, title, slug FROM page ORDER BY sorting;'
            const pages = await pool.query(query)
            req.app.locals.pages = pages
        })
    } catch (error) {
        console.log(error)
    }
})

// GET edit page
router.get('/edit-page/:id', async (req, res) => {
    try {
        const query = 'SELECT id, title, slug, content FROM page WHERE id = ?;'
        const id = [req.params.id]
        let page = await pool.query(query, id)
        page = page[0]
        res.render('admin/edit_page', {
            title: page.title,
            slug: page.slug,
            content: page.content,
            id: page.id
        })
    } catch (error) {
        console.log(error)
    }
})

// POST edit page
router.post('/edit-page/:id', titleContentValidator, async (req, res) => {
    try {
        const title = req.body.title
        const content = req.body.content
        const id = req.params.id
        let slug = req.body.slug.replace(/\s+/g, '-').toLowerCase()
        if (slug == "")
            slug = title.replace(/\s+/g, '-').toLowerCase()
        const errors = validationResult(req).array();
        if (errors.length > 0) {
            res.render('admin/edit_page', { errors, title, slug, content, id })
        }
        else {
            const query = 'SELECT * FROM page WHERE slug = ? AND id != ? LIMIT 1;'
            const filter = [slug, id]
            const page = await pool.query(query, filter)
            if (page.length > 0) {
                req.flash('red', 'Page slug already exists, Please use a different slug')
                req.session.save(() => { res.render('admin/edit_page', { title, slug, content, id }) })
            }
            else {
                const query = 'UPDATE page SET title = ? , slug = ? , content = ? WHERE id = ?; SELECT id, title, slug FROM page ORDER BY sorting;'
                const updatedData = [title, slug, content, id]
                const pages = await pool.query(query, updatedData)
                req.app.locals.pages = pages[1]
                req.flash('green', `Successfully modified ${title} page`)
                req.session.save(() => { res.redirect('/admin/pages/') })
            }
        }
    } catch (error) {
        console.log(error)
    }
})

// GET delete page
router.get('/delete-page/:id', async (req, res) => {
    try {
        const query = 'SELECT title FROM page WHERE id = ?; DELETE FROM page WHERE id = ?; SELECT id, title, slug FROM page ORDER BY sorting;'
        const id = [req.params.id, req.params.id]
        const pages = await pool.query(query, id)
        req.app.locals.pages = pages[2]
        req.flash('grey darken-4', `Successfully deleted ${pages[0][0].title} page`)
        req.session.save(() => { res.redirect('/admin/pages') })
    } catch (error) {
        console.log(error)
    } 
})

module.exports = router