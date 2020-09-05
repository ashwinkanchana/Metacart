const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require("cors")
const session = require('express-session')
const expressValidator = require('express-validator')
const fileUpload = require('express-fileupload')
const passport = require('passport')
const chalk = require('chalk')
const dotenv = require('dotenv')
const morgan = require('morgan')
//Setup env variables
dotenv.config({ path: './config/.env' });

const Page = require('./models/page')
const Category = require('./models/category')
const { ensureAdmin } = require('./controllers/auth')

//Connect to DB
require('./config/database')

// Init app
const app = express();

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
    // cookie: { secure: true }
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
 

app.get('*', (req, res, next)=>{
    res.locals.cart = req.session.cart
    res.locals.user = req.user
    next()
})


//Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

//Load pages from db to locals
Page.find({}).sort({ sorting: 1 }).exec(function (err, pages) {
    if (err) {
        console.log(err)
    } else {
        app.locals.pages = pages
    }
})

//Load categories from db to locals
Category.find({}).exec(function (err, categories) {
    if (err) {
        console.log(err)
    } else {
        app.locals.categories = categories
    }
})


//admin routes
app.use('/admin/pages', ensureAdmin, require('./routes/admin_pages'))
app.use('/admin/categories', ensureAdmin, require('./routes/admin_categories'))
app.use('/admin/products', ensureAdmin, require('./routes/admin_products'))

//user routes
app.use('/products', require('./routes/products'))
app.use('/cart', require('./routes/cart'))
app.use('/auth', require('./routes/auth'))
app.use('/', require('./routes/pages'))



// Handle errors
app.use(function (req, res, next) {
    res.status(404).render('./errors/404');
});

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(chalk.bgGreen.black(`Server up on port ${port}`))
})

