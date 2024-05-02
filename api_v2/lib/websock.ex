defmodule ApiV2.WebSock do
  require Logger

  def init(options) do
    {:ok, options}
  end

  def handle_in({req_str, [opcode: :text]}, state) do
    req = Jason.decode(req_str)

    if {:ok, _} = req do
      handle_req(req, state)
    else
      # We can use encode! because I'm certain it will never raise because the JSON IS valid
      {:reply, :error, {:text,
        Jason.encode!(%{code: 400, message: "The JSON sent is not valid!"})
      }, state}
    end
  end

  def terminate(_reason, state) do
    {:ok, state}
  end

  defp handle_req({_, req}, state) do
    message = ApiV2.Message.from_map(req)

    if :error == message do
      {:reply, :ok, {:text,
        Jason.encode!(%{code: 400, message: "The request did not respect the data stucture of a message in the API"})
      }, state}
    else
      {:reply, :ok, {:text,
        Jason.encode!(%{code: 200, message: "Success"})
      }, state}
    end
  end
end
