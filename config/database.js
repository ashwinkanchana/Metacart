const { promisify } = require('util');
const mysql = require('mysql');
const chalk = require('chalk')

const db_credential = {
    connectionLimit: 10,
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    multipleStatements: true
}

const pool = mysql.createPool(db_credential);


pool.getConnection((err, connection) => {
    if (err) {
        if (err.code == 'PROTOCOL_CONNECTION_LOST') {
            console.error('DATABASE CONNECTION WAS CLOSED')
        }
        else if (err.code == 'ER_CON_COUNT_ERROR') {
            console.error('DATABASE HAS TO MANY CONNECTIOS')
        }
        else if (err.code == 'ECONNREFUSED') {
            console.error('DATABASE CONNECTION WAS REFUSED')
        }
    }
    if (connection) connection.release();
    console.log(chalk.bgGreen.black('Connected to DB'));
    return;
});

//async/await instead of callback
pool.query = promisify(pool.query).bind(pool)


//export db connection pool 
module.exports = {
    pool,
    db_credential
}









