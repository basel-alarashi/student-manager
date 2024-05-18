const router = require('express').Router();
const fs = require('fs');
const sqlite = require('sqlite3');
const d3_module = import('d3');

const db = new sqlite.Database('db.sqlite3', (err) => {
	if (err) {
		console.log(err.message);
	} else {
		console.log('[ADVISOR] Connected.');
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
			const { Password: password, ...advisor } = advisorData[i];
			advisors.push(advisor);
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
						if (data[i][Object.keys(data[i])[0]] === req.body.student) {
							rate = data[i]['النسبة'];
						}
					}
					res.status(200).json(rate);
				}
			});
	});
});

router.post('/send-message', (req, res) => {
	db.run(`INSERT INTO message (content, sender, receiver, rate) VALUES (
		'${req.body.content}', '${req.body.sender}',
		'${req.body.receiver}', '${req.body.rate}')`,
		(err) => {
		if (err) {
			res.status(500).json(err.message);
		} else {
			res.status(200).json('Message has been sent.');
		}
	});
});

router.get('/show-message/:name', (req, res) => {
	db.get(`SELECT * FROM message WHERE receiver='${req.params.name}'
		AND shown=FALSE`,
		(err, row) => {
			if (err) {
				res.status(500).json(err.message);
			} else if (row) {
				res.status(200).json(row);
			} else {
				res.status(200).json('No messages');
			}
		});
});

router.get('/hide-message/:msgId', (req, res) => {
	db.run(`UPDATE message SET shown=TRUE WHERE
		id='${req.params.msgId}'`,
		(err) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				res.status(200).json('Message ended.');
			}
		});
});

router.get('/availability/:name', (req, res) => {
	d3_module.then((d3) => {
		fs.readFile(`./requirement/availability/${req.params.name}.csv`,
			'utf-8', (err, data) => {
			if (err) {
				res.status(500).json(err.message);
			} else {
				data = d3.csvParse(data);
				res.status(200).json(data);
			}
		});
	});
});

router.post('/write-availability', (req, res) => {
	d3_module.then((d3) => {
		const data = d3.csvFormat(req.body.data);
		fs.writeFile(`./requirement/availability/${req.body.name}.csv`,
			data, 'utf-8', (err) => {
				if (err) {
					res.status(500).json(err.message);
				} else {
					res.status(200).json('Changes applied successfully.');
				}
			});
	});
});

module.exports = router;