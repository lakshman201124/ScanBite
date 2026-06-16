import type { Server } from "socket.io";

interface RoomMetrics {
  room: string;
  connections: number;
}

export function getMetrics(io: Server): {
  totalConnections: number;
  rooms: RoomMetrics[];
  memoryMB: number;
} {
  const rooms: RoomMetrics[] = [];
  for (const [room, sockets] of io.sockets.adapter.rooms) {
    // Skip socket-id rooms (every socket has a self-room)
    if (!io.sockets.sockets.has(room)) {
      rooms.push({ room, connections: sockets.size });
    }
  }

  return {
    totalConnections: io.engine.clientsCount,
    rooms: rooms.sort((a, b) => b.connections - a.connections),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
  };
}

export function startMetricsLogging(io: Server, intervalMs: number = 60000): NodeJS.Timeout {
  return setInterval(() => {
    const metrics = getMetrics(io);
    console.log(
      `[metrics] connections=${metrics.totalConnections} ` +
      `rooms=${metrics.rooms.length} ` +
      `memory=${metrics.memoryMB}MB`
    );

    // Alert if approaching limits
    if (metrics.totalConnections > 2000) {
      console.warn('[metrics] HIGH CONNECTION COUNT — consider adding another instance');
    }
    if (metrics.memoryMB > 800) {
      console.warn('[metrics] HIGH MEMORY USAGE — check for connection leaks');
    }
  }, intervalMs);
}
