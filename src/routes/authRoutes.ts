import { Router } from 'express'
import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'
import { createPatient, getPatientById, getPatients }  from '../controllers/patientController'
import { createAppointment, getAppointments, updateAppointment, deleteAppointment } from '../controllers/appointmentsController'
import { createRecord, listRecords } from '../controllers/medicalRecordController'


const router = Router()


router.post('/register', register)
router.post('/login', login)
router.get('/user', getUserByToken)

router.post("/patient", createPatient)
router.get("/patient/list", getPatients)
router.get('/patient/:id', getPatientById)      
router.post('/patient/:id/records', createRecord)
router.get('/patient/:id/records', listRecords)

router.post("/appointments", createAppointment)
router.get("/appointments/list", getAppointments)
router.put("/appointments/:id", updateAppointment)
router.delete("/appointments/:id", deleteAppointment)



export default router
