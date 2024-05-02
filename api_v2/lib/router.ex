defmodule ApiV2.Router do
  require Logger
  require WebSockAdapter
  use Plug.Router

  plug Plug.Logger
  plug :match
  plug :dispatch

  plug ApiV2.Plug

  get "/chat" do
    conn
      |> WebSockAdapter.upgrade(ApiV2.WebSock, [], [])
  end

  match _ do
    conn
      |> put_resp_content_type("application/json")
      |> send_resp(404, Jason.encode!(%{code: 404, message: "Route not found."}))
  end
end
