# type Message = {
#   channel_id: string,
#   message_id: string,
#   author_id: string,
#   username: string,
#   content: string,
#   created_at: number, // unix time
#   updated_at: number // unix time
# }

defmodule ApiV2.Message do
  @enforce_keys [:channel_id, :message_id, :author_id, :username, :content, :created_at, :updated_at]
  defstruct [:channel_id, :message_id, :author_id, :username, :content, :created_at, :updated_at]

  def validate(%{
    "channel_id" => channel_id,
    "message_id" => message_id,
    "author_id" => author_id,
    "username" => username,
    "content" => content,
    "created_at" => created_at,
    "updated_at" => updated_at
  }) when
    is_binary(channel_id)
    and is_binary(message_id)
    and is_binary(author_id)
    and is_binary(username)
    and is_binary(content)
    and is_integer(created_at)
    and is_integer(updated_at)
  do
    true
  end

  def validate(_map) do
    false
  end

  def from_map!(map) do
    %ApiV2.Message{
      channel_id: Map.get(map, "channel_id"),
      message_id: Map.get(map, "message_id"),
      author_id: Map.get(map, "author_id"),
      username: Map.get(map, "username"),
      content: Map.get(map, "content"),
      created_at: Map.get(map, "created_at"),
      updated_at: Map.get(map, "updated_at")
    }
  end

  def from_map(map) do
    if validate(map) do
      {:ok, from_map!(map)}
    else
      :error
    end
  end
end
