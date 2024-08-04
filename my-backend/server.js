const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use('/output_plots', express.static(path.join(__dirname, 'output_plots')));

const upload = multer({ dest: 'uploads/' });

app.post('/api/query', upload.single('file'), (req, res) => {
  const { question } = req.body;
  const filePath = req.file.path;

  const inputData = JSON.stringify({ question, tables: {}, csv_path: filePath });

  const pythonProcess = spawn('python', ['query_model.py', inputData]);

  let resultData = '';
  pythonProcess.stdout.on('data', (data) => {
    resultData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    res.status(500).send('Error processing query');
  });

  pythonProcess.on('close', (code) => {
    try {
      const result = JSON.parse(resultData);
      if (result.error) {
        res.status(500).json({ error: result.error, query: result.query });
      } else {
        res.json({ result: result.result, query: result.query, plots: result.plots });
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      res.status(500).send('Error parsing JSON');
    }
 
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
