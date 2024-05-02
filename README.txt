{01/03/24}
Start both tunnels by running:
```sh
~/ngrok start --all
```

HLS works in the browser! Gotta add DASH for Firefox support!
Fixed CORS issues, gotta add persistence to ScyllaDB so I don't need to create the CQL tables every time

Have a good, well-deserved nigt of sleep!

{02/05/2024}
APIV2 => DO I really need to implement the channel by myself. I don't want to go back to Phoenix lol

SOLUTION: just listen to update from ScyllaDB using Xandra (in another GenServer) and then send it back to each client individually...
It would be ONE REQUEST for N peers which is quite efficint

In the websock handler, you just create a function called at init/1 that listens for update from Xandra and sends it through WS to the client