defmodule ApiWeb.RoomChannel do
  use Phoenix.Channel

  require Logger

  def join("room:" <> _room_id, _params, socket) do
    {:ok, socket}
  end

  def handle_in("new_msg", %{"content" => content, "author_id" => author_id, "username" => username, "channel_id" => channel_id}, socket) do
    {:ok, message_id} = Snowflake.next_id()

    broadcast!(socket, "new_msg", %{content: content, author_id: author_id, username: username, message_id: message_id})

    query = "INSERT INTO messages (
      channel_id,
      message_id,
      author_id,
      username,
      content,
      created_at,
      updated_at) VALUES (?, ?, ?, ?, ?, toTimestamp(now()), toTimestamp(now()));"
    params = [{"bigint", channel_id}, {"bigint", message_id}, {"bigint", author_id}, {"text", username}, {"text", content}]

    Xandra.execute!(:xandra_conn, query, params)

    {:noreply, socket}
  end
end
