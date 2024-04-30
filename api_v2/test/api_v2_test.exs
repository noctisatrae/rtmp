defmodule ApiV2Test do
  use ExUnit.Case
  doctest ApiV2

  test "greets the world" do
    assert ApiV2.hello() == :world
  end
end
