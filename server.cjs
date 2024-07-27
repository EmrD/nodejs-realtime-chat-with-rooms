const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const rooms = {
  room1: { password: '', users: [] },
  room2: { password: '', users: [] },
  room3: { password: '', users: [] }
};

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve specific rooms
app.get('/server/:id', (req, res) => {
  const roomId = `room${req.params.id}`;
  if (rooms[roomId]) {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
  } else {
    res.status(404).send('Room not found');
  }
});

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('set username', (username) => {
    socket.username = username;
  });

  socket.on('join room', ({ room, username, password }) => {
    if (rooms[room]) {
      if (rooms[room].password === '' || rooms[room].password === password) {
        socket.join(room);
        socket.room = room;
        rooms[room].users.push(username);
        io.to(room).emit('chat message', { username: 'System', message: `${username} has joined the room.` });
        socket.emit('room joined', room);
      } else {
        socket.emit('message', 'Incorrect room password.');
      }
    } else {
      socket.emit('message', 'Room does not exist.');
    }
  });

  socket.on('leave room', ({ room, username }) => {
    if (rooms[room]) {
      let index = rooms[room].users.indexOf(username);
      if (index > -1) {
        rooms[room].users.splice(index, 1);
        io.to(room).emit('chat message', { username: 'System', message: `${username} has left the room.` });
        socket.leave(room);
      }
    }
  });

  socket.on('chat message', ({ room, message }) => {
    io.to(room).emit('chat message', { username: socket.username, message });
  });

  socket.on('disconnect', () => {
    if (socket.room) {
      let room = socket.room;
      let index = rooms[room].users.indexOf(socket.username);
      if (index > -1) {
        rooms[room].users.splice(index, 1);
        io.to(room).emit('chat message', { username: 'System', message: `${socket.username} has left the room.` });
      }
    }
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});
