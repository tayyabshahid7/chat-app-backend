const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cassandra = require('cassandra-driver');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(bodyParser.json());
app.use(cors({
  origin: "http://localhost:3000", // Allow your frontend origin
  methods: ["GET", "POST"],
  credentials: true
}));


const client = new cassandra.Client({ contactPoints: ['127.0.0.1'], localDataCenter: 'datacenter1' });
client.connect((err) => {
    if (err) console.error(err);
    console.log('Cassandra connected');
});


const createKeyspace = `CREATE KEYSPACE IF NOT EXISTS chat_app WITH replication = {'class': 'SimpleStrategy', 'replication_factor': '1'}`;
const createUserTable = `CREATE TABLE IF NOT EXISTS chat_app.users (id UUID PRIMARY KEY, username text, password text)`;
const createMessageTable = `CREATE TABLE IF NOT EXISTS chat_app.messages (id UUID PRIMARY KEY, userId UUID, username text, content text, timestamp timestamp)`;

client.execute(createKeyspace)
    .then(() => client.execute(createUserTable))
    .then(() => client.execute(createMessageTable))
    .catch(err => console.error(err));

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'secretkey', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = cassandra.types.Uuid.random();

    const query = 'INSERT INTO chat_app.users (id, username, password) VALUES (?, ?, ?)';
    client.execute(query, [id, username, hashedPassword], { prepare: true })
        .then(() => res.status(201).send({ message: 'User registered' }))
        .catch(err => res.status(500).send(err));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM chat_app.users WHERE username = ? ALLOW FILTERING';
    client.execute(query, [username], { prepare: true })
        .then(async result => {
            if (result.rowLength === 0) return res.status(400).send({ message: 'User not found' });

            const user = result.rows[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) return res.status(400).send({ message: 'Invalid password' });

            const token = jwt.sign({ id: user.id, username: user.username }, 'secretkey');
            res.send({ token });
        })
        .catch(err => res.status(500).send(err));
});

app.get('/messages', authenticateToken, (req, res) => {
    const query = 'SELECT * FROM chat_app.messages LIMIT 50';

    client.execute(query)
        .then(result => res.send(result.rows))
        .catch(err => res.status(500).send(err));
});

app.post('/messages', authenticateToken, (req, res) => {
    const { content } = req.body;
    const id = cassandra.types.Uuid.random();
    const timestamp = new Date();

    const query = 'INSERT INTO chat_app.messages (id, userId, username, content, timestamp) VALUES (?, ?, ?, ?, ?)';
    client.execute(query, [id, req.user.id, req.user.username, content, timestamp], { prepare: true })
        .then(() => {
            io.emit('message', { id, userId: req.user.id, username: req.user.username, content, timestamp });
            res.status(201).send({ message: 'Message sent' });
        })
        .catch(err => res.status(500).send(err));
});


io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
