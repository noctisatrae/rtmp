import { Socket } from "phoenix-socket";

let socket = new Socket("ws://localhost:4000/socket")
socket.connect()

let channel = socket.channel("room:ewen", {})
channel.join()
  .receive("ok", resp => { console.log("Joined successfully!", resp) })
  .receive("error", resp => { console.log("Unable to join", resp) });

type Message = {
  content: string,
  author_id: bigint,
  username: string,
  created_at: bigint
}

let dummy_msg = {
  content: "Hello world!",
  author_id: "9034905903950",
  created_at: "5285908359",
  username: "noctis_atrae"
} 

channel.push("new_msg", dummy_msg)