const express = require('express');
const app = express();

// routes
const advisorRoute = require('./routes/advisor');
const doctorRoute = require('./routes/doctor');
const studentRoute = require('./routes/student');

app.use(express.json());
app.use('/advisors', advisorRoute);
app.use('/doctors', doctorRoute);
app.use('/students', studentRoute);

// FILES
app.get('/', (req, res) => {
	res.sendFile('pages/home.html', {root: __dirname});
});
app.get('/role', (req, res) => {
	res.sendFile('pages/role.html', {root: __dirname});
});
app.get('/dean', (req, res) => {
	res.sendFile('pages/dean.html', {root: __dirname});
});
app.get('/head', (req, res) => {
	res.sendFile('pages/head.html', {root: __dirname});
});
app.get('/medium-bg.jpg', (req, res) => {
	res.sendFile('images/medium-bg.jpg', {root: __dirname});
});
app.get('/large-bg.jpg', (req, res) => {
	res.sendFile('images/large-bg.jpg', {root: __dirname});
});
app.get('/mobile-bg.jpg', (req, res) => {
	res.sendFile('images/mobile-bg.jpg', {root: __dirname});
});
app.get('/logo.jpg', (req, res) => {
	res.sendFile('images/logo.jpg', {root: __dirname});
});
app.get('/cropped-logo.jpg', (req, res) => {
	res.sendFile('images/cropped-logo.jpg', {root: __dirname});
});

app.listen(3000, () => {
	console.log('Server is listening on port 3000...');
});