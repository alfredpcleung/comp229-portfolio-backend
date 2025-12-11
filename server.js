require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const rootRouter = require('./routes/root.routes');
const morgan = require('morgan');
const cors = require('cors');

const app = express();

// connect to MongoDB
connectDB();

// middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());

// routes
app.use('/', rootRouter);

const authRouter = require('./routes/auth.routes');
app.use('/api/auth', authRouter);

const contactsRouter = require('./routes/contacts.routes');
app.use('/api/contacts', contactsRouter);

const projectsRouter = require('./routes/projects.routes');
app.use('/api/projects', projectsRouter);

const servicesRouter = require('./routes/services.routes');
app.use('/api/services', servicesRouter);

const usersRouter = require('./routes/users.routes');
app.use('/api/users', usersRouter);

// error handler
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});