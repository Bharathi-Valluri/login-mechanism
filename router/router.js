const user_controller = require('../controller/userController')
const router = require('express').Router()
router.post('/saveLogin', user_controller.saveLoginCredentials)
router.get('/checkValidUser', user_controller.userLogin)
router.post('/sendMail', user_controller.sendingMail)
router.post('/GenerateNewPassword', user_controller.ResetPassword)

module.exports = router
