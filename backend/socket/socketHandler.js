function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Client joins role-based room if provided
    socket.on('join', (data) => {
      try {
        if (data && data.role) {
          socket.join(`role:${data.role}`);
        }
        if (data && data.username) {
          socket.join(`user:${data.username}`);
        }
        console.log(`[Socket] ${socket.id} joined rooms`);
      } catch (err) {
        console.error('[Socket] Join error:', err);
      }
    });

    // Real-time driver GPS stream
    socket.on('driver:location', (data) => {
      try {
        if (data && data.emergencyCode) {
          socket.broadcast.emit('driver:location_update', data);
        }
      } catch (err) {
        console.error('[Socket] Location update error:', err);
      }
    });

    // IoT Signal State updates
    socket.on('signal:state_change', (data) => {
      try {
        io.emit('signal:updated', data);
      } catch (err) {
        console.error('[Socket] Signal update error:', err);
      }
    });

    // Custom alerts from traffic police
    socket.on('police:broadcast_alert', (data) => {
      try {
        io.emit('police:alert', data);
      } catch (err) {
        console.error('[Socket] Police alert error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = initSocket;
