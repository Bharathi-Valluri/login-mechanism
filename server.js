const express = require('express')
const cors = require('cors')
const createError = require('http-errors')
require('dotenv').config()
const session = require('express-session')
const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())
const router = require('./router/router')
app.use('/', router)
app.use(
  session({
    secret: 'Email login mechanism',
    resave: true,
    saveUninitialized: false,
    cookie: {
      expires: 60000
    }
  })
)
app.use((req, res, next) => {
  next(createError.NotFound())
})

app.use((err, req, res, next) => {
  res.status(err.status || 500)
  res.send({
    status: err.status || 500,
    message: err.message
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`))
