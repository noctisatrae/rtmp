defmodule ApiV2.Plug do
  use Plug.Builder

  plug Plug.Static, from: {:api_v2, "assets/static"}, at: "/"
end
