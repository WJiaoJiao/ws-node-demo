const ws = require('nodejs-websocket')

// 可以通过不同的code可以表示要后端实现的不同逻辑
const RECEIEVE_MESSAGE = 1000;
const SAVE_USER_INFO = 1001;
const CLOSE_CONNECTION = 1002;

// 当前聊天室的用户
let chatUsers = []

// 广播通知
const broadcast = (server, info) => {
  console.log('broadcast', info)
  server.connections.forEach(function(conn) {
    conn.sendText(JSON.stringify(info))
  })
}

// 服务端获取到某个用户的信息通知到所有用户
const broadcastInfo = (server, info) => {
  let count = server.connections.length
  let result = {
    code: RECEIEVE_MESSAGE,
    count: count,
    ...info
  }
  broadcast(server, result)
}

// 返回当前剩余的在线用户
const sendChatUsers = (server, user) => {
  let chatIds = chatUsers.map(item => item.chatId)
  if (chatIds.indexOf(user.chatId) === -1) {
    chatUsers.push(user)
  }
  let result = {
    code: SAVE_USER_INFO,
    count: chatUsers.length,
    chatUsers: chatUsers
  }
  broadcast(server, result)
}

// 触发关闭连接，在离开页面或者关闭页面时，需要主动触发关闭连接
const handleCloseConnect = (server, user) => {
  chatUsers = chatUsers.filter(item => item.chatId !== user.chatId)
  let result = {
    code: CLOSE_CONNECTION,
    count: chatUsers.length,
    chatUsers: chatUsers
  }
  console.log('handleCloseConnect', user)
  broadcast(server, result)
}

// 创建websocket服务
const createServer = () => {
  let server = ws.createServer(connection => {
    connection.on('text', function(result) {
      console.log(result)
      let info = JSON.parse(result)
      let code = info.code
      if (code === CLOSE_CONNECTION) {
        handleCloseConnect(server, info)
        // 某些情况如果客户端多次触发连接关闭，会导致connection.close()出现异常，这里try/catch一下
        try {
          connection.close()
        } catch (error) {
          console.log('close异常', error)
        }
      } else if (code === SAVE_USER_INFO) {
        sendChatUsers(server, info)
      } else {
        broadcastInfo(server, info)
      }
    })
    connection.on('connect', function(code) {
      console.log('开启连接', code)
    })
    connection.on('close', function(code) {
      console.log('关闭连接', code)
    })
    connection.on('error', function(code) {
      // 某些情况如果客户端多次触发连接关闭，会导致connection.close()出现异常，这里try/catch一下
      try {
        connection.close()
      } catch (error) {
        console.log('close异常', error)
      }
      console.log('异常关闭', code)
    })
  })
  // 所有连接释放时，清空聊天室用户
  server.on('close', () => {
    chatUsers = []
  })
  return server
}

const server = createServer().listen(8002);