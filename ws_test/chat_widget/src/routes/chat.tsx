import { useEffect, useRef, useState } from 'react'
import { Socket } from "phoenix-socket";

import '../App.css'
import { Message as MessageType } from '../typdefs';
import Message from '../components/Message';

const socket = new Socket("ws://localhost:4000/socket")

const dummy_msg = {
  content: "",
  author_id: 9034905903950,
  created_at: 5285908359,
  username: "noctis_atrae",
  channel_id: 12643
}

const Chat = () => {
  /* scroll-to-bottom-ref */
  const bottomRef = useRef<any>(null);

  /* state holding data */
  const [msgInput, setMsgInput] = useState<string>("");
  const [msgList, setMsgList] = useState<any>([]);
  const [channel, _setChannel] = useState<any>(socket.channel("room:ewen", {}));

  /* url params */
  const queryParameters = new URLSearchParams(window.location.search)
  const inputOptParam = queryParameters.get("input");
  const inputOpt: boolean = (inputOptParam != null && inputOptParam == 'false' || inputOptParam == 'true' ? 
    (inputOptParam == 'false' ? false : true) 
    : false);

  /* functions definitions */
  const sendMsg = (content: string) => {
    console.log(`[${Date.now()}] - Pushing message...`)
    dummy_msg.content = content;
    channel.push("new_msg", dummy_msg);
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

    bottomRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [msgList])

  return (
    <>
      <div className="chat-box">
        {msgList.map((msg: MessageType) => <Message {...msg} />)}
        <div ref={bottomRef} />
      </div>
      {inputOpt ?
      <>
      <input 
            className="msg-input text-white" 
            content={msgInput} 
            placeholder='Type your message' 
            onChange={(e) => setMsgInput(e.target.value)} 
            onKeyDown={(e) => (e.key === "Enter" ? sendMsg(msgInput) : {})}></input> <button className='send-button' onClick={() => sendMsg(msgInput)}>Send</button>
      </>
      : <></>
      }
    </>
  )
}

export default Chat;
