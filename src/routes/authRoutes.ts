import { Router } from 'express'
import multer from 'multer'

import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'
import { createPatient, getPatientById, getPatients } from '../controllers/patientController'
import { createAppointment, getAppointments, updateAppointment, deleteAppointment } from '../controllers/appointmentsController'
import { createRecord, listRecords } from '../controllers/medicalRecordController'
import { createAnamnesis, listAnamnesis } from '../controllers/anamnesisController'
import { createMaterial, deleteMaterial, listMaterials, updateMaterial } from '../controllers/materialsController'
import { createMachine, listMachines, updateMachine, deleteMachine } from '../controllers/machineController'
import { createPrescription, listPrescriptions, updatePrescription, deletePrescription } from '../controllers/prescriptionsController'
import { createExam, listExams } from '../controllers/examsController'
import { authenticate } from '../middlewares/auth'

const upload = multer({ storage: multer.memoryStorage() })

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/user', getUserByToken)

router.post('/patient', createPatient)
router.get('/patient/list', getPatients)
router.get('/patient/:id', getPatientById)
router.post('/patient/:id/records', createRecord)
router.get('/patient/:id/records', listRecords)

router.post('/appointments', createAppointment)
router.get('/appointments/list', getAppointments)
router.put('/appointments/:id', updateAppointment)
router.delete('/appointments/:id', deleteAppointment)

router.post('/patient/:id/anamnesis', createAnamnesis)
router.get('/patient/:id/anamnesis', listAnamnesis)

router.post('/materials', authenticate, createMaterial)
router.get('/materials/list', authenticate, listMaterials)
router.put('/materials/:id', authenticate, updateMaterial)
router.delete('/materials/:id', authenticate, deleteMaterial)

router.post('/machines', authenticate, createMachine)
router.get('/machines/list', authenticate, listMachines)
router.put('/machines/:id', authenticate, updateMachine)
router.delete('/machines/:id', authenticate, deleteMachine)

router.post('/prescriptions', authenticate, createPrescription)
router.get('/prescriptions/list', authenticate, listPrescriptions)
router.put('/prescriptions/:id', authenticate, updatePrescription)
router.delete('/prescriptions/:id', authenticate, deletePrescription)

router.post('/patient/:id/exams', upload.single('file'), createExam)
router.get('/patient/:id/exams/list', listExams)

export default router
