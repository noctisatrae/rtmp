import { Message as MessageType } from "../typdefs";

const Message = (message: MessageType) => {
  return <li className="message" key={message.message_id}>
    <span className="username">{message.username}</span>: <p className="msg-content">{message.content}</p> 
  </li>
}

export default Message;