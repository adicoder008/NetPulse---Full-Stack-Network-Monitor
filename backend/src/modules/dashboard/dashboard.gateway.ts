const sockets = new Set<any>();

export function registerDashboardGateway(app: any) {
  app.get("/ws", { websocket: true }, (socket: any) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });
}

export function publishDashboardEvent(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  for (const socket of sockets) {
    if (socket.readyState === 1) {
      socket.send(payload);
    }
  }
}
