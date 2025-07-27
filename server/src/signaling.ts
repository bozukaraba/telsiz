import { Server, Socket } from 'socket.io';

interface User {
  id: string;
  username: string;
  roomId: string;
}

interface Room {
  id: string;
  name: string;
  users: Map<string, User>;
  createdAt: Date;
}

export class SignalingServer {
  private io: Server;
  private rooms: Map<string, Room> = new Map();
  private users: Map<string, User> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`Kullanıcı bağlandı: ${socket.id}`);

      // Kullanıcı odaya katılma
      socket.on('join-room', (data: { roomId: string; username: string }) => {
        this.handleJoinRoom(socket, data);
      });

      // Kullanıcı odadan ayrılma
      socket.on('leave-room', () => {
        this.handleLeaveRoom(socket);
      });

      // WebRTC signaling
      socket.on('signal', (data: { 
        targetUserId: string; 
        signal: any; 
        type: 'offer' | 'answer' | 'ice-candidate' 
      }) => {
        this.handleSignal(socket, data);
      });

      // PTT başlatma
      socket.on('ptt-start', () => {
        this.handlePTTStart(socket);
      });

      // PTT durdurma
      socket.on('ptt-stop', () => {
        this.handlePTTStop(socket);
      });

      // Oda listesi isteği
      socket.on('get-rooms', () => {
        this.handleGetRooms(socket);
      });

      // Bağlantı koparsa
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinRoom(socket: Socket, data: { roomId: string; username: string }): void {
    const { roomId, username } = data;

    // Kullanıcıyı önce mevcut odadan çıkar
    this.handleLeaveRoom(socket);

    // Oda yoksa oluştur
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        name: roomId,
        users: new Map(),
        createdAt: new Date()
      });
    }

    const room = this.rooms.get(roomId)!;
    const user: User = {
      id: socket.id,
      username,
      roomId
    };

    // Kullanıcıyı odaya ekle
    room.users.set(socket.id, user);
    this.users.set(socket.id, user);

    // Socket'i odaya katıl
    socket.join(roomId);

    // Diğer kullanıcılara bildir
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      username
    });

    // Kullanıcıya mevcut kullanıcıları gönder
    const otherUsers = Array.from(room.users.values())
      .filter(u => u.id !== socket.id)
      .map(u => ({ id: u.id, username: u.username }));

    socket.emit('room-joined', {
      roomId,
      users: otherUsers
    });

    console.log(`${username} odaya katıldı: ${roomId}`);
  }

  private handleLeaveRoom(socket: Socket): void {
    const user = this.users.get(socket.id);
    if (!user) return;

    const room = this.rooms.get(user.roomId);
    if (room) {
      room.users.delete(socket.id);
      
      // Oda boşsa sil
      if (room.users.size === 0) {
        this.rooms.delete(user.roomId);
      } else {
        // Diğer kullanıcılara bildir
        socket.to(user.roomId).emit('user-left', {
          userId: socket.id,
          username: user.username
        });
      }
    }

    socket.leave(user.roomId);
    this.users.delete(socket.id);
  }

  private handleSignal(socket: Socket, data: { 
    targetUserId: string; 
    signal: any; 
    type: 'offer' | 'answer' | 'ice-candidate' 
  }): void {
    const { targetUserId, signal, type } = data;
    
    socket.to(targetUserId).emit('signal', {
      fromUserId: socket.id,
      signal,
      type
    });
  }

  private handlePTTStart(socket: Socket): void {
    const user = this.users.get(socket.id);
    if (!user) return;

    // Odadaki diğer kullanıcılara PTT başladığını bildir
    socket.to(user.roomId).emit('ptt-started', {
      userId: socket.id,
      username: user.username
    });

    console.log(`${user.username} PTT başlattı`);
  }

  private handlePTTStop(socket: Socket): void {
    const user = this.users.get(socket.id);
    if (!user) return;

    // Odadaki diğer kullanıcılara PTT durduğunu bildir
    socket.to(user.roomId).emit('ptt-stopped', {
      userId: socket.id,
      username: user.username
    });

    console.log(`${user.username} PTT durdurdu`);
  }

  private handleGetRooms(socket: Socket): void {
    const roomList = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      userCount: room.users.size,
      createdAt: room.createdAt
    }));

    socket.emit('rooms-list', roomList);
  }

  private handleDisconnect(socket: Socket): void {
    console.log(`Kullanıcı ayrıldı: ${socket.id}`);
    this.handleLeaveRoom(socket);
  }
} 