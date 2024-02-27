import { Socket } from "phoenix-socket";

let socket = new Socket("ws://localhost:4000/socket")
socket.connect()

let channel = socket.channel("room:chat", {})
channel.join()
  .receive("ok", resp => { console.log("Joined successfully!", resp) })
  .receive("error", resp => { console.log("Unable to join", resp) })

channel.push("new_msg", {body: "zizi"})