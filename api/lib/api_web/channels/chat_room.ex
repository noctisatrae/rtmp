defmodule ApiWeb.RoomChannel do
  use Phoenix.Channel

  require Logger

  def join("room:" <> _room_id, _params, socket) do
    {:ok, socket}
  end

  def handle_in("new_msg", %{"content" => content, "author_id" => author_id, "username" => username, "created_at" => created_at}, socket) do
    broadcast!(socket, "new_msg", %{content: content, author_id: author_id, username: username, created_at: created_at})
    {:noreply, socket}
  end
end
