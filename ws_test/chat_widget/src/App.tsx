import { useEffect, useState } from 'react'
import { Socket } from "phoenix-socket";

import './App.css'

const socket = new Socket("ws://localhost:4000/socket")

const dummy_msg = {
  content: "",
  author_id: 9034905903950,
  created_at: 5285908359,
  username: "noctis_atrae",
  channel_id: 12643
}

function App() {
  const [msgInput, setMsgInput] = useState<string>("");
  const [msgList, setMsgList] = useState<any>([]);
  const [channel, _setChannel] = useState<any>(socket.channel("room:ewen", {}));

  /* functions definitions */
  const sendMsg = (content: string) => {
    console.log(`[${Date.now()}] - Pushing message...`)
    dummy_msg.content = content;
    channel.push("new_msg", dummy_msg)
  }

  /* useEffect hooks */
  useEffect(() => {
    socket.connect()
    channel.join()
      .receive("ok", (resp: any) => { console.log("Joined successfully!", resp) })
      .receive("error", (resp: any) => { console.log("Unable to join", resp) });    
  }, [])

  useEffect(() => {
    channel.on('new_msg', (msg: any) => {
      setMsgList([...msgList, msg])
    })
  }, [msgList])

  return (
    <>
      <div className="card">
        {msgList.map((msg:any) => <li key={msg.msg_id}>{msg.content}</li>)}
        <input 
          className="msg-input" 
          content={msgInput} 
          placeholder='Type your message' 
          onChange={(e) => setMsgInput(e.target.value)}></input>
        <button onClick={() => sendMsg(msgInput)}>Send</button>
      </div>
    </>
  )
}

export default App
