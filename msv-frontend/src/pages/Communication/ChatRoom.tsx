import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Divider,
  Stack,
  Paper,
  InputAdornment,
  Badge
} from '@mui/material';
import {
  Chat as ChatIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';

interface Message {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  isOwn: boolean;
}

interface ChatRoom {
  id: number;
  name: string;
  type: 'private' | 'group';
  participants: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  avatar?: string;
}

const ChatRoom: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 샘플 채팅방 데이터
  const chatRooms: ChatRoom[] = [
    {
      id: 1,
      name: '개발팀',
      type: 'group',
      participants: 8,
      lastMessage: '오늘 회의는 3시에 시작합니다.',
      lastMessageTime: '14:30',
      unreadCount: 3,
      avatar: undefined
    },
    {
      id: 2,
      name: '김철수',
      type: 'private',
      participants: 2,
      lastMessage: '프로젝트 진행상황 확인 부탁드립니다.',
      lastMessageTime: '13:45',
      unreadCount: 1,
      avatar: undefined
    },
    {
      id: 3,
      name: '마케팅팀',
      type: 'group',
      participants: 5,
      lastMessage: '새로운 캠페인 아이디어가 있나요?',
      lastMessageTime: '12:20',
      unreadCount: 0,
      avatar: undefined
    },
    {
      id: 4,
      name: '이영희',
      type: 'private',
      participants: 2,
      lastMessage: '감사합니다!',
      lastMessageTime: '11:15',
      unreadCount: 0,
      avatar: undefined
    }
  ];

  // 샘플 메시지 데이터
  const sampleMessages: Message[] = [
    {
      id: 1,
      senderId: 2,
      senderName: '김철수',
      content: '안녕하세요! 프로젝트 진행상황을 확인하고 싶습니다.',
      timestamp: '13:30',
      type: 'text',
      isOwn: false
    },
    {
      id: 2,
      senderId: 1,
      senderName: '나',
      content: '네, 현재 개발이 80% 정도 완료되었습니다.',
      timestamp: '13:32',
      type: 'text',
      isOwn: true
    },
    {
      id: 3,
      senderId: 2,
      senderName: '김철수',
      content: '좋습니다! 언제쯤 완료 예정인가요?',
      timestamp: '13:35',
      type: 'text',
      isOwn: false
    },
    {
      id: 4,
      senderId: 1,
      senderName: '나',
      content: '이번 주 금요일까지 완료 예정입니다.',
      timestamp: '13:37',
      type: 'text',
      isOwn: true
    },
    {
      id: 5,
      senderId: 2,
      senderName: '김철수',
      content: '프로젝트 진행상황 확인 부탁드립니다.',
      timestamp: '13:45',
      type: 'text',
      isOwn: false
    }
  ];

  useEffect(() => {
    if (selectedRoom) {
      setMessages(sampleMessages);
      scrollToBottom();
    }
  }, [selectedRoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        senderId: 1,
        senderName: '나',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        type: 'text',
        isOwn: true
      };
      setMessages([...messages, message]);
      setNewMessage('');
      scrollToBottom();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const filteredRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 120px)' }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          fontWeight: 600,
          color: 'text.primary'
        }}>
          <ChatIcon sx={{ fontSize: '2rem', color: 'primary.main' }} />
          채팅방
        </Typography>
        <Typography variant="body2" color="text.secondary">
          팀원들과 실시간으로 소통하는 채팅 페이지입니다.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', height: 'calc(100% - 100px)', gap: 2 }}>
        {/* 채팅방 목록 */}
        <Card sx={{ width: 300, display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                채팅방
              </Typography>
              <IconButton size="small">
                <AddIcon />
              </IconButton>
            </Box>
            <TextField
              fullWidth
              size="small"
              placeholder="채팅방 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
          <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
            <List sx={{ p: 0 }}>
              {filteredRooms.map((room) => (
                <ListItem
                  key={room.id}
                  disablePadding
                >
                  <ListItemButton
                    selected={selectedRoom?.id === room.id}
                    onClick={() => setSelectedRoom(room)}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: 'primary.light',
                        '&:hover': {
                          backgroundColor: 'primary.light',
                        },
                      },
                    }}
                  >
                  <ListItemAvatar>
                    <Badge
                      badgeContent={room.unreadCount}
                      color="error"
                      invisible={room.unreadCount === 0}
                    >
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {room.type === 'group' ? (
                          <GroupIcon />
                        ) : (
                          <PersonIcon />
                        )}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" fontWeight={500}>
                          {room.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.lastMessageTime}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {room.lastMessage}
                        </Typography>
                        <Chip
                          label={room.type === 'group' ? `${room.participants}명` : '1:1'}
                          size="small"
                          color="info"
                          sx={{ ml: 1, height: 16, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                  />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Card>

        {/* 채팅 영역 */}
        <Card sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {selectedRoom.type === 'group' ? (
                        <GroupIcon />
                      ) : (
                        <PersonIcon />
                      )}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {selectedRoom.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedRoom.type === 'group' ? `${selectedRoom.participants}명` : '1:1 채팅'}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              </Box>

              {/* 메시지 목록 */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                <Stack spacing={2}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.isOwn ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        sx={{
                          p: 2,
                          maxWidth: '70%',
                          backgroundColor: message.isOwn ? 'primary.main' : 'grey.100',
                          color: message.isOwn ? 'white' : 'text.primary',
                        }}
                      >
                        {!message.isOwn && (
                          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.7 }}>
                            {message.senderName}
                          </Typography>
                        )}
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                          {message.timestamp}
                        </Typography>
                      </Paper>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              </Box>

              {/* 메시지 입력 */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <IconButton size="small">
                    <AttachFileIcon />
                  </IconButton>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                  />
                  <IconButton size="small">
                    <EmojiIcon />
                  </IconButton>
                  <Button
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    sx={{ borderRadius: 3 }}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2
            }}>
              <ChatIcon sx={{ fontSize: '4rem', color: 'grey.400' }} />
              <Typography variant="h6" color="text.secondary">
                채팅방을 선택해주세요
              </Typography>
              <Typography variant="body2" color="text.secondary">
                왼쪽에서 채팅방을 선택하여 대화를 시작하세요.
              </Typography>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
};

export default ChatRoom;