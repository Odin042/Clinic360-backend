import { Router } from 'express'
import multer from 'multer'

import { register } from '../controllers/authController'
import { getUserByToken, updateUserProfile } from '../controllers/userController'
import { createPatient, getPatientById, getPatients } from '../controllers/patientController'
import { 
  createAppointment, 
  getAppointments, 
  updateAppointment, 
  deleteAppointment,
  startAppointment,
  completeAppointment,
  markAppointmentAsMissed,
  getAppointmentReport
} from '../controllers/appointmentsController'
import { createRecord, listRecords } from '../controllers/medicalRecordController'
import { createAnamnesis, listAnamnesis } from '../controllers/anamnesisController'
import { createMaterial, deleteMaterial, listMaterials, updateMaterial } from '../controllers/materialsController'
import { createMachine, listMachines, updateMachine, deleteMachine } from '../controllers/machineController'
import { createPrescription, listPrescriptions, updatePrescription, deletePrescription } from '../controllers/prescriptionsController'
import { createExam, listExams } from '../controllers/examsController'
import ProcedureController from '../controllers/ProcedureController'
import { uploadProcedureImage } from '../controllers/uploadsController'

import {
  createExamOrder,
  deleteExamOrder,
  getExamOrderById,
  listExamOrdersByPatient,
  updateExamOrder
} from '../controllers/examsOrderController'

const upload = multer({ storage: multer.memoryStorage() })
console.log('authRoutes carregado')

const router = Router()

router.post('/register', register)
router.get('/user', getUserByToken)
console.log('Registrando rota PUT /user')
router.put('/user', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'logo', maxCount: 1 }
]), updateUserProfile)

router.post('/patient', createPatient)
router.get('/patient/list', getPatients)
router.get('/patient/:id', getPatientById)
router.post('/patient/:id/records', createRecord)
router.get('/patient/:id/records', listRecords)

router.post('/appointments', createAppointment)
router.get('/appointments/list', getAppointments)
router.get('/appointments/report', getAppointmentReport)
router.post('/appointments/:id/start', startAppointment)
router.post('/appointments/:id/complete', completeAppointment)
router.post('/appointments/:id/mark-missed', markAppointmentAsMissed)
router.put('/appointments/:id', updateAppointment)
router.delete('/appointments/:id', deleteAppointment)

router.post('/patient/:id/anamnesis', createAnamnesis)
router.get('/patient/:id/anamnesis', listAnamnesis)

router.post('/materials', createMaterial)
router.get('/materials/list', listMaterials)
router.put('/materials/:id', updateMaterial)
router.delete('/materials/:id', deleteMaterial)

router.post('/machines', createMachine)
router.get('/machines/list', listMachines)
router.put('/machines/:id', updateMachine)
router.delete('/machines/:id', deleteMachine)

router.post('/prescriptions', createPrescription)
router.get('/prescriptions/list', listPrescriptions)
router.put('/prescriptions/:id', updatePrescription)
router.delete('/prescriptions/:id', deletePrescription)

router.post('/patient/:id/exams', upload.single('file'), createExam)
router.get('/patient/:id/exams/list', listExams)

router.post('/patient/:id/procedures/uploads', upload.single('file'), uploadProcedureImage)

router.get('/procedures', ProcedureController.listProcedures)
router.post('/procedures', ProcedureController.createProcedure)
router.get('/procedures/:id', ProcedureController.getProcedureById)
router.delete('/procedures/:id', ProcedureController.deleteProcedure)

router.get('/procedimentos', ProcedureController.listProcedures)
router.post('/procedimentos', ProcedureController.createProcedure)
router.delete('/procedimentos/:id', ProcedureController.deleteProcedure)

router.get('/relatorios/dia/:date', ProcedureController.getDayReport)

router.post('/exam-orders', createExamOrder)
router.get('/exam-orders/:id', getExamOrderById)
router.patch('/exam-orders/:id', updateExamOrder)
router.delete('/exam-orders/:id', deleteExamOrder)
router.get('/patient/:id/exam-orders/list', listExamOrdersByPatient)

export default router