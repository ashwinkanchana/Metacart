const checksum = require('../lib/checksum');
const config = require('../config');

const initPayment = function(orderID, userID, amount) {
  return new Promise((resolve, reject) => {
    let paymentObj = {
      ORDER_ID: orderID,
      CUST_ID: userID,
      INDUSTRY_TYPE_ID: config.INDUSTRY_TYPE_ID,
      CHANNEL_ID: config.CHANNEL_ID,
      TXN_AMOUNT: amount.toString(),
      MID: config.MID,
      WEBSITE: config.WEBSITE,
      CALLBACK_URL: config.CALLBACK_URL
    };

    checksum.genchecksum(
      paymentObj,
      config.PAYTM_MERCHANT_KEY,
      (err, result) => {
        if (err) {
          return reject('Payment failed, Error while generating checksum');
        } else {
          paymentObj.CHECKSUMHASH = result;
          return resolve(paymentObj);
        }
      }
    );
  });
};

const responsePayment = function(paymentObject) {
  return new Promise((resolve, reject) => {
    if (
      checksum.verifychecksum(
        paymentObject,
        config.PAYTM_MERCHANT_KEY,
        paymentObject.CHECKSUMHASH
      )
    ) {
      resolve(paymentObject);
    } else {
      return reject('Payment failed, Error while verifying checksum');
    }
  });
};

module.exports = {
  initPayment: initPayment,
  responsePayment: responsePayment
};
