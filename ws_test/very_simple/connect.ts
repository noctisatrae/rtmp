/*
CREATE TABLE messages (
  channel_id bigint,
  message_id bigint,
  author_id bigint,
  username text,
  content text,
  created_at timestamp,
  updated_at timestamp,
  PRIMARY KEY ((channel_id), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
*/

// the id use Snowflake which are 64-integers long. TS limit is 53 so we use string to hold them
type Message = {
  channel_id: string,
  message_id: string,
  author_id: string,
  username: string,
  content: string,
  created_at: number, // unix time
  updated_at: number // unix time
}

// db in snake case so type in snake case too
const test_msg: Message = {
  channel_id: "0",
  message_id: "0",
  author_id: "0",
  username: "Hector",
  content: "Hello world!",
  created_at: Date.now(),
  updated_at: Date.now()
}

const ws2 = new WebSocket("ws://0.0.0.0:4000/chat?id=zizi")
ws2.addEventListener("message", (ev) => {
  console.log(JSON.parse(ev.data))
}) 
ws2.addEventListener("open", () => ws2.send(
  JSON.stringify(test_msg)
))