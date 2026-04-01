const express = require("express");
const cors = require("cors");

require("dotenv").config();

const connectDB = require("./config/db");

const { mountRoutes } = require('./routes');

const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { attachAuth } = require('./middleware/authUser');


// Crons

const scheduleRegenEnergy = require('./cronjobs/regenEnergy');
const scheduleRegenNerve = require('./cronjobs/regenNerve');
const scheduleJob = require('./cronjobs/jobCron');
const scheduleRegenHappiness = require('./cronjobs/regenHappiness');
const scheduleStockTicker = require('./cronjobs/stockTicker');
const scheduleRegenCooldowns = require('./cronjobs/regenCooldowns');
const scheduleNpcActions = require('./cronjobs/npcActions');
const schedulePlayerSnapshots = require('./cronjobs/playerSnapshot');
const scheduleBankApr = require('./cronjobs/bankApr');
const scheduleDailyReset = require('./cronjobs/dailyReset');
const scheduleBusinessIncome = require('./cronjobs/businessCron');
const scheduleCartelTick = require('./cronjobs/cartelCron');

const app = express();

connectDB();

const allowedOrigins = [
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  // Vue dev server
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];


const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// CORS and preflight handling
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(attachAuth);
app.use(requestLogger());

// Routes
mountRoutes(app);

// 404 middleware and error handler must be last
app.use(notFound);
app.use(errorHandler);

if (process.env.DISABLE_CRON !== 'true') {
  scheduleRegenEnergy();
  scheduleRegenNerve();
  scheduleJob();
  scheduleRegenHappiness();
  scheduleStockTicker();
  scheduleBankApr();
  scheduleNpcActions();
  schedulePlayerSnapshots();
  scheduleRegenCooldowns();
  scheduleDailyReset();
  scheduleBusinessIncome();
  scheduleCartelTick();
}

const PORT = Number(process.env.PORT) || 5050;
app.listen(PORT, () => {
  console.log('Server started at ' + new Date().toISOString());
  console.log(`Server is running on port ${PORT}`);
});