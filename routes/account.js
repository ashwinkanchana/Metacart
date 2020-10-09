const express = require('express')
const router = express.Router()
const { pool } = require('../config/database')
const mysql = require('mysql')
const { validationResult } = require('express-validator')
const { newAddressValidator } = require('../validators/account')


// GET my account page
router.get('/', async (req, res) => {
  const address = await getAddresses(req.user.id)
  res.render('account', {
    fullname: req.user.fullname,
    email: req.user.email,
    address,
    open_address_form: false,
    edit_address: false
  })
})


// POST add new address
router.post('/add-address', newAddressValidator, async (req, res) => {
  try {
    const fullname = req.body.fullname
    const new_address = req.body.address
    const pincode = req.body.pin
    const phone = req.body.phone
    const errors = validationResult(req).array();
    if (errors.length > 0) {
      const address = await getAddresses(req.user.id)
      res.render('account', {
        email: req.user.email,
        errors: [errors[0]], fullname, address, new_address, pincode, phone,
        open_address_form: true,
        edit_address: false
      })
    }
    else {
      const query = 'INSERT INTO address (user_id, fullname, address, pincode, phone) VALUES (?);'
      const values = [[req.user.id, fullname, new_address, pincode, phone]]
      const status = await pool.query(query, values)
      req.flash('grey darken-4', 'Added a new address')
      req.session.save(() => { res.redirect('/account') })
    }
  } catch (error) {
    console.log(error)
    req.flash('red', 'Something went wrong!')
    req.session.save(() => { res.redirect('/') })
  }
})



// GET edit saved address page
router.get('/edit-address/:id', async (req, res) => {
  try {
    const query = `SELECT * FROM address WHERE user_id = ${mysql.escape(req.user.id)} AND id = ${req.params.id};`
    const address = await getAddresses(req.user.id)
    const editAddress = (await pool.query(query))[0]
    console.log(editAddress);
    const { fullname, pincode, phone } = editAddress
    const new_address = editAddress.address
    res.render('account', {
      email: req.user.email,
      address, fullname, new_address, new_address, pincode, phone,
      address_id: req.params.id,
      open_address_form: true,
      edit_address: true
    })
  } catch (error) {
    console.log(error);
    req.flash('red', 'Something went wrong!')
    req.session.save(() => { res.redirect('/') })
  }
})


// POST add new address
router.post('/edit-address', newAddressValidator, async (req, res) => {
  try {
    const fullname = req.body.fullname
    const editAddressId = req.body.address_id
    const new_address = req.body.address
    const pincode = req.body.pin
    const phone = req.body.phone
    const errors = validationResult(req).array();
    if (errors.length > 0) {
      const address = await getAddresses(req.user.id)
      res.render('account', {
        email: req.user.email,
        errors: [errors[0]], fullname, address, new_address, pincode, phone,
        open_address_form: true,
        edit_address: true
      })
    }
    else {
      const query = 'UPDATE address SET fullname = ?, address = ?, pincode = ?, phone = ? WHERE user_id = ? AND id = ?;'
      const values = [fullname, new_address, pincode, phone, req.user.id, editAddressId]
      const status = await pool.query(query, values)
      req.flash('grey darken-4', 'Successfully edited an address')
      req.session.save(() => { res.redirect('/account') })
    }
  } catch (error) {
    console.log(error)
    req.flash('red', 'Something went wrong!')
    req.session.save(() => { res.redirect('/') })
  }
})


async function getAddresses(userID) {
  try {
    const addressQuery = 'SELECT * FROM address WHERE user_id = (?);';
    const address = await pool.query(addressQuery, [userID])
    return address
  } catch (error) {
    throw new Error(error)
  }
}


module.exports = router