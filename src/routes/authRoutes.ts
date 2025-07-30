import { Router } from 'express'
import { register, login } from '../controllers/authController'
import { getUserByToken } from '../controllers/userController'
import { createPatient, getPatientById, getPatients }  from '../controllers/patientController'
import { createAppointment, getAppointments, updateAppointment, deleteAppointment } from '../controllers/appointmentsController'
import { createRecord, listRecords } from '../controllers/medicalRecordController'
import { createAnamnesis, listAnamnesis } from '../controllers/anamnesisController'
import { createMaterial, deleteMaterial, listMaterials, updateMaterial } from '../controllers/materialsController'
import {
  createMachine,
  listMachines,
  updateMachine,
  deleteMachine
} from '../controllers/machineController'
import { createPrescription, listPrescriptions, updatePrescription, deletePrescription } from '../controllers/prescriptionsController'


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


export default router
