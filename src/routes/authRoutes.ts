import { Router } from 'express'
import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'
import { createPatient, getPatients }  from '../controllers/patientContoller'
import { createAppointment, getAppointments, updateAppointment, deleteAppointment } from '../controllers/appointmentsController'


const router = Router()


router.post('/register', register)
router.post('/login', login)
router.get('/user', getUserByToken)
router.post("/patient", createPatient)   
router.get("/patient/list", getPatients)
router.post("/appointments", createAppointment)
router.get("/appointments/list", getAppointments)
router.put("/appointments/:id", updateAppointment)
router.delete("/appointments/:id", deleteAppointment)

export default router
