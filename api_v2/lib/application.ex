defmodule ApiV2.Application do
  use Application
  require Logger

  def start(_type, _args) do
    children = [
      {Bandit, plug: ApiV2.Router}
    ]

    opts = [strategy: :one_for_one, name: ApiV2.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
