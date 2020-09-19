const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require("cors")
const session = require('express-session')
const fileUpload = require('express-fileupload')
const passport = require('passport')
const MySQLStore = require('express-mysql-session')(session);
const chalk = require('chalk')
const dotenv = require('dotenv')
const morgan = require('morgan')

//Setup env variables
dotenv.config({ path: './config/.env' });

const { ensureAuthenticated ,ensureAdmin } = require('./controllers/auth')

// Init app
const app = express();

//Get DB pool
const { pool, db_credential } = require('./config/database')

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs')

// Set public folder
app.use(express.static(path.join(__dirname, '/public')));


//Express fileupload middleware
app.use(fileUpload())

//Cross-origin resource sharing
app.use(cors())

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


//Express session
app.use(session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store: new MySQLStore(db_credential)
    //cookie: { secure: true }
    //flash will not work with cookie 
}))

//Set global error variable
app.locals.errors = null

// Express Messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});

//Passport Middleware
require('./config/passport')(passport)
app.use(passport.initialize())
app.use(passport.session())


app.get('*',async(req, res, next) => {
    res.locals.cart = req.session.cart
    res.locals.user = req.user
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next()
})


//Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

//Load Pages and Categories from DB to app.locals
(async () => {
    const pagesQuery = 'SELECT title, slug, content FROM page ORDER BY page.sorting'
    const categoryQuery = 'SELECT id, title, slug FROM category'
    const searchTermsQuery = 'SELECT id, title, image FROM product;'
    try {
        app.locals.pages = await pool.query(pagesQuery)
        app.locals.categories = await pool.query(categoryQuery)
        const products = await pool.query(searchTermsQuery)
        let searchTerms = {}
        products.forEach(p => {
            searchTerms[`${p.title}`] = `/product_images/${p.id}/${p.image}`
        });
        app.locals.searchTerms = searchTerms
    } catch (error) {
        console.log(error)
    }
})()

//admin routes
app.use('/admin/pages', ensureAdmin, require('./routes/admin_pages'))
app.use('/admin/categories', ensureAdmin, require('./routes/admin_categories'))
app.use('/admin/products', ensureAdmin, require('./routes/admin_products'))

//user routes
app.use('/products', require('./routes/products'))
app.use('/cart', require('./routes/cart'))
app.use('/auth', require('./routes/auth'))
app.use('/search', require('./routes/search'))
app.use('/', require('./routes/pages'))


// Handle errors
app.use(function (req, res, next) {
    res.status(404).render('./errors/404');
});

const port = process.env.PORT || 3000


app.listen(port, async () => {
    console.log(chalk.bgGreen.black(`Server up on ${port}`))
})

module.exports = app;