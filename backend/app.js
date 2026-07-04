require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./src/middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth',      require('./src/routes/auth'));
app.use('/stations',  require('./src/routes/stations'));
app.use('/reports',   require('./src/routes/reports'));
app.use('/favorites', require('./src/routes/favorites'));
app.use('/refuels',   require('./src/routes/refuels'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TanqueCerto API rodando na porta ${PORT}`));
