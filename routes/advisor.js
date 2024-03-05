const router = require('express').Router();
const fs = require('fs');
const sqlite = require('sqlite3');
const d3_module = import('d3');

const db = new sqlite.Database('db.sqlite3', (err) => {
	if (err) {
		console.log(err.message);
	} else {
		db.run(`CREATE TABLE IF NOT EXISTS message (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			content VARCHAR(255),
			sender VARCHAR(63),
			receiver VARCHAR(30),
			time TEXT DEFAULT CURRENT_TIMESTAMP
		)`, (error) => {
			if (error) {
				console.log(error.message);
			} else {
				console.log('Connected.');
			}
		});
	}
});

const advisorPromise = new Promise((resolve, reject) => {
	d3_module.then((d3) => {
		fs.readFile('./requirement/advisor.csv', 'utf-8', (err, data) => {
			if (err) {
				reject(err);
			} else {
				data = d3.csvParse(data);
				resolve(data);
			}
		});
	});
});

// PAGES
router.get('/advisor/:name', (req, res) => {
	res.sendFile('pages/students.html', {root: '.'});
});

// API
router.post('/login', async (req, res) => {
	let advisor = null;
	const data = await advisorPromise;
	for (var i = data.length - 1; i >= 0; i--) {
		if (data[i]['المرشد'] === req.body.name && data[i]['Password'] === req.body.password) {
			advisor = data[i];
		}
	}
	if (advisor) {
		res.status(202).json('Advisor has been logged in.');
	} else {
		res.status(401).json('Sorry, You are not an advisor in UOK.');
	}
});

router.get('/details/:name', async (req, res) => {
	const advisorData = await advisorPromise;
	let advisors = [];
	for (var i = advisorData.length - 1; i >= 0; i--) {
		if (advisorData[i]['المرشد'] === req.params.name) {
			delete advisorData[i]['Password'];
			advisors.push(advisorData[i]);
		}
	}
	res.status(200).json(advisors);
});

router.post('/attendance', (req, res) => {
	d3_module.then((d3) => {
		fs.readFile(`./requirement/attendance/${req.body.course}.csv`, 'utf-8',
			(err, data) => {
				if (err) {
					res.status(500).json(err.message);
				} else {
					data = d3.csvParse(data);
					let rate = 0;
					for (var i = data.length - 1; i >= 0; i--) {
						if (data[i]['الرقم'] === req.body.student) {
							for (var j = Object.keys(data[i]).length - 1; j >= 0; j--) {
								if (data[i][j] === 'غ') {
									rate += 6;
								} else if (data[i][j] === 'ن') {
									rate += 4;
								} else if (data[i][j] === 'ع') {
									rate += 2;
								} else if (data[i][j] === 'ب') {
									rate += 3;
								}
							}
						}
					}
					res.status(200).json(rate);
				}
			});
	});
});

router.post('/send-message', (req, res) => {
	db.run(`INSERT INTO message (content, sender, receiver) VALUES (
		'${req.body.content}', '${req.body.sender}', '${req.body.receiver}')`,
		(err) => {
		if (err) {
			res.status(500).json(err.message);
		} else {
			res.status(200).json('Message has been sent.');
		}
	});
});

module.exports = router;