import { Router } from 'express'
import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'

const router = Router()


router.post('/register', register)
router.post('/login', login)
router.get('/user', getUserByToken)

export default router
