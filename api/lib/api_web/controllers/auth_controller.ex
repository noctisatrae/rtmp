defmodule ApiWeb.AuthController do
  use ApiWeb, :controller

  def handle(conn, _params) do
    conn
      |> put_resp_content_type("application/json")
      |> send_resp(200, Jason.encode!(%{hello: "world"}))
  end
end
