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
    const token = jwt.sign(req.body.email, process.env.SecretKey, {
      expiresIn: process.env.JWT_EXPIRE
    })
    const resp = await prisma.user.create({
      data: {
        email: req.body.email,
        password: req.body.password,
        token: token
      }
    })
    console.log(resp)
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
    let user = JSON.parse(JSON.stringify(req.body.user))
    const findUser = await prisma.user.findUnique({
      where: {
        email: String(user.email)
      }
    })
    if (findUser) {
      const isUnique = await bcrypt.compare(user.password, findUser.password)

      if (isUnique) {
        user.token = jwt.sign({ id: findUser.id }, process.env.SecretKey)
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
    if (errorMsg.length > 0) {
      res.status(400).json({
        status: appConst.status.fail,
        response: errorMsg,
        message: appConst.status.invalidRequest
      })
    } else {
      res.status(200).json({
        status: appConst.status.login_success,
        response: { data },
        message: appConst.status.login_success
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
const session = async (req, res) => {
  try {
    if (req.session.views) {
      req.session.views++
      res.write(
        `
    <p> Session expires after 1 min of in activity: ` +
          req.session.cookie.expires +
          '</p>'
      )
      res.end()
    } else {
      req.session.views = 1
      res.end(' New session is started')
    }
  } catch (error) {
    res.send(error.message)
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
      const date = new Date()
      // const time = new Date(date.getTime() + 1 * 60000).toLocaleTimeString()
      const time = new Date(date.getTime() + 5 * 60000).toLocaleTimeString()

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
            <a href="">http://localhost:${process.env.PORT}/resetpassword/${user.token}</a>`
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
    const date = new Date()
    const currenttime = new Date(date.getTime()).toLocaleTimeString()
    console.log(currenttime)
    if (currenttime <= findUser.expiretime) {
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
      }
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

const forgetPassword = async (req, res) => {
  try {
    const findEmail = await prisma.user.findFirst({
      where: { email: req.body.email }
    })
    console.log(findEmail)
    if (findEmail) {
      const token = jwt.sign(
        { data: req.body.email },
        'mysterykeytokengeneratedrandomly',
        { expiresIn: '15m' }
      )
      //   mail.sendForgetPasswordMail(token, req.body.email, findEmail.email)

      await prisma.user.update({
        where: { email: req.body.email },
        data: {
          changedPassword: true
        }
      })
      res.send({ message: token })
    } else {
      res.send({
        message: 'oops! looks like you need to register with us first!',
        status: 'Failed'
      })
    }
  } catch (error) {
    res.send({ message: 'no user found', status: 'failed' })
  }
}
const checkForgetPassword = async (req, res) => {
  try {
    const decoded = jwt.verify(
      req.body.token,
      'mysterykeytokengeneratedrandomly'
    )
    const checkMail = await prisma.user.findFirst({
      where: { email: decoded.data }
    })
    if (decoded && checkMail.changedPassword) {
      encryptedPassword = await bcrypt.hash(req.body.password, 10)
      const findEmail = await prisma.user.update({
        where: { email: decoded.data },
        data: {
          password: encryptedPassword,
          changedPassword: false,
          resetPassword: false
        }
      })
      console.log(findEmail)
      res.send({ message: 'changed succesfully' })
    } else {
      res.send({ message: '', status: 'failed' })
    }
  } catch (error) {
    res.send({
      error: error,
      status: 'failed'
    })
  }
}
const validateToken = async (req, res) => {
  try {
    const findEmail = await prisma.user.findFirst({
      where: { email: req.body.email }
    })
    console.log(findEmail)
    const token = req.body.token
    if (token) {
      const decode = jwt.verify(token, process.env.SecretKey)
      console.log(decode)
    }
    res.status(200).send({
      status: 'token and mail matched successfully!...',
      message: 'success'
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({
      response: null,
      message: 'failed!!!....'
    })
  }
}
const generateToken = async (req, res) => {
  try {
    const findEmail = await prisma.user.findFirst({
      where: { email: req.body.email }
    })
    console.log(findEmail)
    let token = 'false'
    if (findEmail) {
      const generateToken = jwt.sign(
        { data: req.body.email },
        process.env.SecretKey,
        {
          expiresIn: '15m'
        }
      )
      const resp = await prisma.user.update({
        where: {
          email: req.body.email
        },
        data: {
          token: generateToken
        }
      })
      token = resp
    }

    res.status(200).send({
      status: 'token generated successfully!...',
      message: token
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({
      status: 'failed!!!',
      response: null,
      message: 'failed'
    })
  }
}

module.exports = {
  saveLoginCredentials,
  userLogin,
  sendingMail,
  session,
  generateToken,
  forgetPassword,
  validateToken,
  checkForgetPassword
}
