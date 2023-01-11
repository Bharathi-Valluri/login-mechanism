const { PrismaClient } = require('@prisma/client')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()
const nodemailer = require('nodemailer')

const { appConst } = require('../router/constants')

// saving the login credentials into DB
const saveLoginCredentials = async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10)
    console.log(salt, 'sssssssssss**********####ttttt')
    const encryptedPassword = await bcrypt.hash(req.body.password, salt)
    console.log(encryptedPassword, '************EncryptedPassword*******')
    req.body.password = encryptedPassword
    console.log('password::   ' + encryptedPassword)
    const resp = await prisma.user.create({
      data: req.body
    })
    res.status(200).json({
      status: appConst.status.success,
      response: resp,
      message: 'success'
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({
      status: appConst.status.fail,
      response: null,
      message: 'failed'
    })
  }
}
// validate the user with session expiration of 1 minute activity and updating the token
const userLogin = async (req, res) => {
  try {
    let data = []
    let errorMsg = []
    if (req.session.views) {
      req.session.views++
      let user = JSON.parse(JSON.stringify(req.body.user))
      const findUser = await prisma.user.findUnique({
        where: {
          email: String(user.email)
        }
      })
      if (findUser) {
        const isUnique = await bcrypt.compare(user.password, findUser.password)

        if (isUnique) {
          user.token = jwt.sign({ id: findUser.id }, process.env.secretKey)
          console.log(user.token)

          const resp = await prisma.user.update({
            where: {
              email: String(user.email)
            },
            data: {
              email: user.email,
              password: findUser.password,
              token: user.token
            }
          })

          data.push(resp)
        } else {
          errorMsg.push({ message: appConst.status.incorrectPassword })
        }
      } else {
        errorMsg.push({ message: appConst.status.incorrectEmail })
      }
    } else {
      req.session.views = 1
      errorMsg.push({ message: appConst.status.sessionExpiration })
    }
    if (errorMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errorMsg,
        message: appConst.status.invalidRequest
      })
    } else {
      res.status(200).json({
        status: appConst.status.success,
        response: { data },
        message: appConst.status.success
      })
    }
  } catch (error) {
    console.log(error)
    res.status(400).json({
      status: appConst.status.fail,
      response: null,
      message: 'failed'
    })
  }
}

// Generate a token for sending the mail through the link
const sendingMail = async (req, res) => {
  let user = JSON.parse(JSON.stringify(req.body.user))
  try {
    let data = []
    let errorMsg = []
    const findUser = await prisma.user.findUnique({
      where: {
        email: String(user.email)
      }
    })
    if (findUser) {
      user.token = jwt.sign({ email: findUser.email }, process.env.SecretKey)

      const resp = await prisma.user.update({
        where: {
          email: String(user.email)
        },
        data: {
          token: user.token
        }
      })
      const findMail = await prisma.user.findFirst({
        where: {
          email: String(user.email),
          token: String(user.token)
        }
      })
      if (findMail) {
        let transporter = nodemailer.createTransport({
          Host: 'smtp.mailtrap.io',
          Port: 2525,
          Auth: {
            Username: '147bdc9fc3f795',
            Password: 'dc70bf6ac18979'
          }
        })
        let mailOptions = {
          from: 'vbharathi1998@gmail.com',
          to: 'vbharathi1998@gmail.com',
          subject: 'link to Reset_password',
          text: 'Reset your password',
          html: `<h2>Hi,</h2>
            <h4> please click the below link to Reset password</h4>
            <a href="">http://localhost:${process.env.PORT}/resetpswd/${user.token}</a>`
        }
        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            errorMsg.push({ message: err.message })
            return err
          }
          console.log('Mail Sent' + info.response)
        })
      } else {
        errorMsg.push({ message: appConst.status.invalidEmail })
      }
      data.push(resp)
    } else {
      errorMsg.push({ message: appConst.status.userDoesnotexist })
    }
    if (errorMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errorMsg,
        message: appConst.status.invalidRequest
      })
    } else {
      res.status(200).json({
        status: appConst.status.success,
        response: { data },
        message: appConst.status.mail_sent
      })
    }
  } catch (error) {
    console.log(error.message)
    res.status(400).json({
      status: appConst.status.fail,
      message: error.message
    })
  }
}
// Generating the new password or update the password
const ResetPassword = async (req, res) => {
  let user = JSON.parse(JSON.stringify(req.body.user))
  try {
    const findUser = await prisma.user.findFirst({
      where: {
        email: String(user.email),
        forgettoken: String(user.forgettoken)
      }
    })
    if (findUser) {
      const salt = await bcrypt.genSalt(10)
      const encryptedPassword = await bcrypt.hash(user.password, salt)
      user.password = encryptedPassword
      const resp = await prisma.user.update({
        where: {
          email: String(user.email)
        },
        data: {
          password: user.password,
          forgettoken: null
        }
      })
      res.status(200).json({
        status: appConst.status.success,
        response: resp,
        message: appConst.status.success
      })
    } else {
      res.status(400).json({
        status: appConst.status.fail,
        message: appConst.status.invalidEmail
      })
    }
  } catch (error) {
    res.status(400).json({
      status: appConst.status.fail,
      message: error.message
    })
  }
}
module.exports = { saveLoginCredentials, userLogin, sendingMail, ResetPassword }
