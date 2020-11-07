# Metacart
[![Heroku](https://heroku-badge.herokuapp.com/?app=heroku-badge)](https://metacart.herokuapp.com/)
[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/ashwinkanchana/)

Metacart is an E-commerce website with admin panel designed and implemented for
single seller using Node.js and MySQL. Deployed on Heroku with AWS RDS and S3. 

#### Demo on Heroku - https://metacart.herokuapp.com  

| <img align='center' src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" width=100> | <img align='center' src="https://i.cloudup.com/zfY6lL7eFa-3000x3000.png" width=100> | <img align='center' src="https://www.mysql.com/common/logos/logo-mysql-170x115.png" width=100> | <img align='center' src="https://i.postimg.cc/FRnkcdng/materialize.png" width=100> |
|-----------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| <img align='center' src="https://i.postimg.cc/KjZpKWwg/aws.png" width=120>                                | <img align='center' src="https://i.postimg.cc/ydzZsgrL/paytm.jpg" width=100>        | <img align='center' src="https://i.postimg.cc/4N1wMZnC/oAuth.png" width=130>                   | <img align='center' src="https://i.postimg.cc/L5tvmFT1/sendgrid.png" width=100>    |    |


### Features
- View catalogue of products, filter by category and price range, sort by
popularity and price and search for specific product by title
- Secure login and registration system with features like Google OAuth sign-in,
password reset and account activation
- Content management system for admin to maintain the content, order of
webpages and adding dynamic content on the website with rich-text editor
- Adding new products, editing existing products, deleting existing products,
auto generating thumbnail images for products and updating order status
along with tracking ID
- Adding a new category, editing existing category and deleting existing
category
- Users upon purchasing a product will have an option to rate the product and
also write a review about the experience
- Users can maintain multiple delivery addresses for easy checkout
- Users can use the cart system where products can be added, removed,
increment, decrement, clear entire cart along with providing a detailed view
of order subtotal and total pricing
- The cart items are stored in database when the user is logged in else the
items are temporarily stored in the session cookie and merged to database
when user logs in.
- The products are paginated for quick load time and the user can navigate
between the pages
- Paytm payment gateway integration for secure and reliable payments via
multiple methods like credit card, debit card, Paytm wallet, Net-banking
- User can cancel the order once the payment has been successful if required.
- User can return the product within a period of 30 days from the moment
when order is `Delivered`.
- The admin/seller has a birds-eye view of all the orders divided into sections
by their current status so that they can be managed with ease.
- The webpages are responsive and designed using Materialize 


### NPM Dependencies

* [aws-sdk](https://www.npmjs.com/package/aws-sdk) - AWS S3 for media storage
* [bcryptjs](https://www.npmjs.com/package/bcryptjs) - Hashing passwords
* [body-parser](https://www.npmjs.com/package/body-parser) - Body parsing middleware
* [chalk](https://www.npmjs.com/package/chalk) - Colorful terminal!
* [@sendgrid/mail](https://www.npmjs.com/package/@sendgrid/mail) - Sending mails
* [cors](https://www.npmjs.com/package/cors) - Cross-origin resource sharing
* [crypto-random-string](https://www.npmjs.com/package/crypto-random-string) - Generating identifiers
* [dotenv](https://www.npmjs.com/package/dotenv) - Loading ENV vars
* [ejs](https://www.npmjs.com/package/ejs) - Templating engine
* [express](https://www.npmjs.com/package/express) - App framework
* [express-fileupload](https://www.npmjs.com/package/express-fileupload) - Uploading files
* [express-messages](https://www.npmjs.com/package/express-messages) - Flash messages
* [express-mysql-session](https://www.npmjs.com/package/express-mysql-session) - Sessions store
* [express-session](https://www.npmjs.com/package/express-session) - Sessions
* [express-validator](https://www.npmjs.com/package/express-validator) - Input validation
* [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - JWT
* [lodash](https://www.npmjs.com/package/lodash) - JS utilities
* [bad-words](https://www.npmjs.com/package/bad-words) - Filtering profanity
* [moment](https://www.npmjs.com/package/moment) - Formatting timestamps
* [morgan](https://www.npmjs.com/package/morgan) - Development logging
* [mysql](https://www.npmjs.com/package/mysql) - MySQL connector
* [passport](https://www.npmjs.com/package/passport) - Authentication middleware
* [passport-google-oauth20](https://www.npmjs.com/package/passport-google-oauth20) - Google OAuth 
* [passport-local](https://www.npmjs.com/package/passport-local) - Local authentication
* [resize-img](https://www.npmjs.com/package/resize-img) - Generating thumbnails
* [shortid](https://www.npmjs.com/package/shortid) - Generating short ids
* [uuid](https://www.npmjs.com/package/uuid) - Generating RFC4122 UUIDs
* [nodemon](https://www.npmjs.com/package/nodemon) - Easy development


### Installation

1. Metacart requires [Node.js](https://nodejs.org/) to run.
2. Install the dependencies and devDependencies
```sh
$ npm install
```
3. Genetate all required API keys for PayTM, AWS, Google and SendGrid from their consoles
5. Acquire MySQL connection credentials and create tables
6. Use [mkcert](https://github.com/FiloSottile/mkcert) to generate self-signed SSL certificate for localhost
6. Create `.env` file in `/config` with following variables
```sh
$ touch .env
```
| **Variable**           | **Value**                                      | **Info**                                     |
|------------------------|------------------------------------------------|----------------------------------------------|
| CALLBACK_URL           | `https://localhost:3000/checkout/paytm-response` | Callback URL after PayTM payment             |
| CHANNEL_ID             | `WEB`                                          | PayTM integration                            |
| INDUSTRY_TYPE_ID       | `Retail`                                       | PayTM integration                            |
| MID                    |                                                | PayTM merchant ID                            |
| PAYTM_FINAL_URL        |                                                | PayTM URL for payment init                   |
| PAYTM_MERCHANT_KEY     |                                                | PayTM merchant key                           |
| WEBSITE                | `WEBSTAGING`                                   | PayTM integration                            |
| CLIENT_URL             | `https://localhost:3000`                       | App URL                                      |
| DATABASE_HOST          |                                                | MySQL hostname                               |
| DATABASE_NAME          |                                                | MySQL DB name                                |
| DATABASE_PASSWORD      |                                                | MySQL password                               |
| DATABASE_USER          |                                                | MySQL username                               |
| EMAIL_FROM             |                                                | Email address used to send                   |
| EMAIL_TO               |                                                | Reply-to mail address                        |
| EXPRESS_SESSION_SECRET |                                                | Secret value                                 |
| GOOGLE_CLIENT_ID       |                                                | Obtain Client ID from Google console         |
| GOOGLE_CLIENT_SECRET   |                                                | Google client secret from console            |
| JWT_ACCOUNT_ACTIVATION |                                                | Secret value to sign account activation link |
| JWT_PASSWORD_RESET     |                                                | Secret value to sign forgot password link    |
| NODE_ENV               | `development` or `production`                  | Node environment                             |
| SENDGRID_API_KEY       |                                                | Twilio Sendgrid API key                      |
| SESSION_SECRET         |                                                | Secret value for sessions                    |
| AWS_ID                 |                                                | AWS integration id                           |
| AWS_SECRET             |                                                | AWS secret key                               |
| AWS_BUCKET_NAME        | `ecommerce-metacart`                           | AWS s3 media bucket name                     |
| SSL_CERT               |                                                | Self signed SSL certificate for localhost    |
| SSL_KEY                |                                                | Self signed SSL key for localhost            |

7. Start the server
```sh
node app
```
8. Verify the deployment
```sh
https://localhost:3000
```
 &nbsp;
#### 🚀🚀🚀🚀
 &nbsp;
### **Make sure app is running on `HTTPS` only, for its operation as intended**
&nbsp;
## License



[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/ashwinkanchana/)

---
> May the source be with you





   

 
