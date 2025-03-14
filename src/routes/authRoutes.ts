import { Router } from 'express'
import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'
import { createPatient, getPatients }  from '../controllers/patientContoller'


const router = Router()


router.post('/register', register)
router.post('/login', login)
router.get('/user', getUserByToken)
router.post("/patient", createPatient)   
router.get("/patient/list", getPatients)

export default router
