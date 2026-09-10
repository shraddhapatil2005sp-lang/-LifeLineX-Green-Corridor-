function initSocket(io) {
  io.on('connection', (socket) => {
    // Client joins role-based room if provided
    socket.on('join', (data) => {
      if (data && data.role) {
        socket.join(`role:${data.role}`);
      }
      if (data && data.username) {
        socket.join(`user:${data.username}`);
      }
    });

    // Real-time driver GPS stream
    socket.on('driver:location', (data) => {
      // Broadcast to Traffic Police, Medical Staff, Hospital, Admin
      socket.broadcast.emit('driver:location_update', data);
    });

    // IoT Signal State updates
    socket.on('signal:state_change', (data) => {
      io.emit('signal:updated', data);
    });

    // Custom alerts from traffic police
    socket.on('police:broadcast_alert', (data) => {
      io.emit('police:alert', data);
    });
  });
}

module.exports = initSocket;
