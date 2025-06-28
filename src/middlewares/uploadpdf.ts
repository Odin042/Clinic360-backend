import multer from 'multer'

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Apenas arquivos PDF são permitidos'))
  }
})

export const pdfUpload = upload.single('file')