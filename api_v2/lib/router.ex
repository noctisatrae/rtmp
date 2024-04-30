defmodule ApiV2.Router do
  require Logger
  use Plug.Router

  plug Plug.Logger
  plug :match
  plug :dispatch

  plug ApiV2.Plug

  get "/chat" do
    conn = fetch_query_params(conn)
    id = case Map.fetch(conn.query_params, "id") do
      {:ok, value} -> value
      :error -> nil
    end

    if id == :null do
      conn
        |> put_resp_content_type("application/json")
        |> send_resp(400, Jason.encode!(%{code: 404, message: "Missing the id in query!"}))
    end

    conn
      |> put_resp_content_type("application/json")
      |> send_resp(400, Jason.encode!(%{code: 404, message: "Missing the id in query!"}))
  end

  match _ do
    conn
      |> put_resp_content_type("application/json")
      |> send_resp(404, Jason.encode!(%{code: 404, message: "Route not found."}))
  end
end
