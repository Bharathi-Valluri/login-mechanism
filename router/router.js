const user_controller = require('../controller/userController')
const router = require('express').Router()
router.post('/saveLogin', user_controller.saveLoginCredentials)
router.get('/checkValidUser', user_controller.userLogin)
router.get('/sessionExpiration', user_controller.session)
router.post('/sendMail', user_controller.sendingMail)
router.post('/generateToken', user_controller.generateToken)
router.post('/verifyToken', user_controller.validateToken)

router.post('/checkforgetPassword', user_controller.checkForgetPassword)
// const isAuthenticate = function (req, res, next) {
//   console.log('authentication done for a valid user')
//   console.log(req.body)
//   res.send('Hii')
// }
router.post('/GenerateNewPassword', user_controller.forgetPassword)

module.exports = router
