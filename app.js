const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const expressValidator = require('express-validator')
const fileUpload = require('express-fileupload')
const passport = require('passport')
const chalk = require('chalk')
const dotenv = require('dotenv')
const morgan = require('morgan')
//Setup env variables
dotenv.config({path: './config/.env'});

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


// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

  
//Express session
app.use(session({
    secret: 'keyboard cat',
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



//Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
}

app.use('/admin/pages', require('./routes/admin_pages'))
app.use('/admin/categories', require('./routes/admin_categories'))
app.use('/admin/products', require('./routes/admin_products'))
app.use('/', require('./routes/pages'))


const port = process.env.PORT || 3000
app.listen(port, ()=>{
    console.log(chalk.bgGreen.black(`Server up on port ${port}`))
})