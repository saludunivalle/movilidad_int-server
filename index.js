const express = require('express');
const { google } = require('googleapis');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sheetValuesToObject } = require('./utils');
const { config } = require('dotenv');
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Comprobaciones adicionales para asegurar que las variables de entorno estén definidas
if (!process.env.private_key) {
  throw new Error('Missing private_key in environment variables');
}

const privateKey = process.env.private_key.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: {
    type: process.env.type,
    project_id: process.env.project_id,
    private_key_id: process.env.private_key_id,
    private_key: privateKey,
    client_email: process.env.client_email,
    client_id: process.env.client_id,
    auth_uri: process.env.auth_uri,
    token_uri: process.env.token_uri,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
});

app.use(bodyParser.json());
app.use(cors());

// Ruta para la raíz
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

// Ruta para obtener datos de la hoja específica
app.post('/getEntrantePregradoData', async (req, res) => {
  try {
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = '15IlZdhAnBikcpG-lkkFqu0vJLhNTMrWsCI5hxWgt3LI';
    const range = 'ENTRANTE - PREGRADO!A1:Z1000';

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.json({
      status: true,
      data: sheetValuesToObject(response.data.values),
    });
  } catch (error) {
    console.error('Error al obtener datos:', error);
    res.status(400).json({ status: false, error: 'Error en la conexión' });
  }
});

// Ruta para insertar datos en la hoja específica
app.post('/sendEntrantePregradoData', async (req, res) => {
  try {
    const { insertData } = req.body;
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = '15IlZdhAnBikcpG-lkkFqu0vJLhNTMrWsCI5hxWgt3LI';
    const range = 'ENTRANTE - PREGRADO';

    const responseSheet = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const currentValues = responseSheet.data.values;
    const nextRow = currentValues ? currentValues.length + 1 : 1;
    const updatedRange = `${range}!A${nextRow}`;

    const sheetsResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: updatedRange,
      valueInputOption: 'RAW',
      resource: {
        values: [insertData],
      },
    });

    if (sheetsResponse.status === 200) {
      return res.status(200).json({ success: 'Se insertó correctamente', status: true });
    } else {
      return res.status(400).json({ error: 'No se insertó', status: false });
    }
  } catch (error) {
    console.error('Error al insertar datos:', error);
    return res.status(400).json({ error: 'Error en la conexión', status: false });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en el puerto ${PORT}`);
});
