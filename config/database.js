const mongoose = require('mongoose')
const chalk = require('chalk')

//Connect to DB
mongoose.connect(process.env.DATABASE_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, chalk.bgRed.white('DB Connection error:')));
db.once('open', function () {
    console.log(chalk.bgGreen.black('Connected to MongoDB'));
})