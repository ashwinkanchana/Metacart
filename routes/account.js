const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const { validationResult } = require('express-validator')
const { newAddressValidator } = require('../validators/account')

 /**
  * TODO
  * // POST update profile (name, password)
  */




module.exports = router