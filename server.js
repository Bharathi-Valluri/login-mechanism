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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`))
