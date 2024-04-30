defmodule ApiV2.Router do
  use Plug.Router

  plug Plug.Logger
  plug :match
  plug :dispatch

  get "/" do
    send_resp(conn, 200, """
    Use the JavaScript console to interact using websockets

    sock  = new WebSocket("ws://localhost:4000/websocket")
    sock.addEventListener("message", console.log)
    sock.addEventListener("open", () => sock.send("ping"))
    """)
  end
end
