defmodule ApiWeb.CassandraConnection do
  use GenServer

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(opts) do
    {:ok, conn} = Xandra.start_link(nodes: opts[:nodes], username: opts[:username], password: opts[:password])
    {:ok, conn}
  end
end
