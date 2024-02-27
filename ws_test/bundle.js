// node_modules/phoenix-socket/vendor/socket.js
var VSN = "1.0.0";
var SOCKET_STATES = { connecting: 0, open: 1, closing: 2, closed: 3 };
var DEFAULT_TIMEOUT = 1e4;
var CHANNEL_STATES = {
  closed: "closed",
  errored: "errored",
  joined: "joined",
  joining: "joining",
  leaving: "leaving"
};
var CHANNEL_EVENTS = {
  close: "phx_close",
  error: "phx_error",
  join: "phx_join",
  reply: "phx_reply",
  leave: "phx_leave"
};
var TRANSPORTS = {
  longpoll: "longpoll",
  websocket: "websocket"
};

class Push {
  constructor(channel, event, payload, timeout) {
    this.channel = channel;
    this.event = event;
    this.payload = payload || {};
    this.receivedResp = null;
    this.timeout = timeout;
    this.timeoutTimer = null;
    this.recHooks = [];
    this.sent = false;
  }
  resend(timeout) {
    this.timeout = timeout;
    this.cancelRefEvent();
    this.ref = null;
    this.refEvent = null;
    this.receivedResp = null;
    this.sent = false;
    this.send();
  }
  send() {
    if (this.hasReceived("timeout")) {
      return;
    }
    this.startTimeout();
    this.sent = true;
    this.channel.socket.push({
      topic: this.channel.topic,
      event: this.event,
      payload: this.payload,
      ref: this.ref
    });
  }
  receive(status2, callback) {
    if (this.hasReceived(status2)) {
      callback(this.receivedResp.response);
    }
    this.recHooks.push({ status: status2, callback });
    return this;
  }
  matchReceive({ status: status2, response, ref }) {
    this.recHooks.filter((h) => h.status === status2).forEach((h) => h.callback(response));
  }
  cancelRefEvent() {
    if (!this.refEvent) {
      return;
    }
    this.channel.off(this.refEvent);
  }
  cancelTimeout() {
    clearTimeout(this.timeoutTimer);
    this.timeoutTimer = null;
  }
  startTimeout() {
    if (this.timeoutTimer) {
      return;
    }
    this.ref = this.channel.socket.makeRef();
    this.refEvent = this.channel.replyEventName(this.ref);
    this.channel.on(this.refEvent, (payload) => {
      this.cancelRefEvent();
      this.cancelTimeout();
      this.receivedResp = payload;
      this.matchReceive(payload);
    });
    this.timeoutTimer = setTimeout(() => {
      this.trigger("timeout", {});
    }, this.timeout);
  }
  hasReceived(status2) {
    return this.receivedResp && this.receivedResp.status === status2;
  }
  trigger(status2, response) {
    this.channel.trigger(this.refEvent, { status: status2, response });
  }
}

class Channel {
  constructor(topic, params, socket) {
    this.state = CHANNEL_STATES.closed;
    this.topic = topic;
    this.params = params || {};
    this.socket = socket;
    this.bindings = [];
    this.timeout = this.socket.timeout;
    this.joinedOnce = false;
    this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
    this.pushBuffer = [];
    this.rejoinTimer = new Timer(() => this.rejoinUntilConnected(), this.socket.reconnectAfterMs);
    this.joinPush.receive("ok", () => {
      this.state = CHANNEL_STATES.joined;
      this.rejoinTimer.reset();
      this.pushBuffer.forEach((pushEvent) => pushEvent.send());
      this.pushBuffer = [];
    });
    this.onClose(() => {
      this.rejoinTimer.reset();
      this.socket.log("channel", `close ${this.topic} ${this.joinRef()}`);
      this.state = CHANNEL_STATES.closed;
      this.socket.remove(this);
    });
    this.onError((reason) => {
      if (this.isLeaving() || this.isClosed()) {
        return;
      }
      this.socket.log("channel", `error ${this.topic}`, reason);
      this.state = CHANNEL_STATES.errored;
      this.rejoinTimer.scheduleTimeout();
    });
    this.joinPush.receive("timeout", () => {
      if (!this.isJoining()) {
        return;
      }
      this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
      this.state = CHANNEL_STATES.errored;
      this.rejoinTimer.scheduleTimeout();
    });
    this.on(CHANNEL_EVENTS.reply, (payload, ref) => {
      this.trigger(this.replyEventName(ref), payload);
    });
  }
  rejoinUntilConnected() {
    this.rejoinTimer.scheduleTimeout();
    if (this.socket.isConnected()) {
      this.rejoin();
    }
  }
  join(timeout = this.timeout) {
    if (this.joinedOnce) {
      throw `tried to join multiple times. 'join' can only be called a single time per channel instance`;
    } else {
      this.joinedOnce = true;
      this.rejoin(timeout);
      return this.joinPush;
    }
  }
  onClose(callback) {
    this.on(CHANNEL_EVENTS.close, callback);
  }
  onError(callback) {
    this.on(CHANNEL_EVENTS.error, (reason) => callback(reason));
  }
  on(event, callback) {
    this.bindings.push({ event, callback });
  }
  off(event) {
    this.bindings = this.bindings.filter((bind) => bind.event !== event);
  }
  canPush() {
    return this.socket.isConnected() && this.isJoined();
  }
  push(event, payload, timeout = this.timeout) {
    if (!this.joinedOnce) {
      throw `tried to push '${event}' to '${this.topic}' before joining. Use channel.join() before pushing events`;
    }
    let pushEvent = new Push(this, event, payload, timeout);
    if (this.canPush()) {
      pushEvent.send();
    } else {
      pushEvent.startTimeout();
      this.pushBuffer.push(pushEvent);
    }
    return pushEvent;
  }
  leave(timeout = this.timeout) {
    this.state = CHANNEL_STATES.leaving;
    let onClose = () => {
      this.socket.log("channel", `leave ${this.topic}`);
      this.trigger(CHANNEL_EVENTS.close, "leave", this.joinRef());
    };
    let leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
    leavePush.receive("ok", () => onClose()).receive("timeout", () => onClose());
    leavePush.send();
    if (!this.canPush()) {
      leavePush.trigger("ok", {});
    }
    return leavePush;
  }
  onMessage(event, payload, ref) {
    return payload;
  }
  isMember(topic) {
    return this.topic === topic;
  }
  joinRef() {
    return this.joinPush.ref;
  }
  sendJoin(timeout) {
    this.state = CHANNEL_STATES.joining;
    this.joinPush.resend(timeout);
  }
  rejoin(timeout = this.timeout) {
    if (this.isLeaving()) {
      return;
    }
    this.sendJoin(timeout);
  }
  trigger(event, payload, ref) {
    let { close, error, leave, join } = CHANNEL_EVENTS;
    if (ref && [close, error, leave, join].indexOf(event) >= 0 && ref !== this.joinRef()) {
      return;
    }
    let handledPayload = this.onMessage(event, payload, ref);
    if (payload && !handledPayload) {
      throw "channel onMessage callbacks must return the payload, modified or unmodified";
    }
    this.bindings.filter((bind) => bind.event === event).map((bind) => bind.callback(handledPayload, ref));
  }
  replyEventName(ref) {
    return `chan_reply_${ref}`;
  }
  isClosed() {
    return this.state === CHANNEL_STATES.closed;
  }
  isErrored() {
    return this.state === CHANNEL_STATES.errored;
  }
  isJoined() {
    return this.state === CHANNEL_STATES.joined;
  }
  isJoining() {
    return this.state === CHANNEL_STATES.joining;
  }
  isLeaving() {
    return this.state === CHANNEL_STATES.leaving;
  }
}

class Socket {
  constructor(endPoint, opts = {}) {
    this.stateChangeCallbacks = { open: [], close: [], error: [], message: [] };
    this.channels = [];
    this.sendBuffer = [];
    this.ref = 0;
    this.timeout = opts.timeout || DEFAULT_TIMEOUT;
    this.transport = opts.transport || window.WebSocket || LongPoll;
    this.heartbeatIntervalMs = opts.heartbeatIntervalMs || 30000;
    this.reconnectAfterMs = opts.reconnectAfterMs || function(tries) {
      return [1000, 2000, 5000, 1e4][tries - 1] || 1e4;
    };
    this.logger = opts.logger || function() {
    };
    this.longpollerTimeout = opts.longpollerTimeout || 20000;
    this.params = opts.params || {};
    this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
    this.reconnectTimer = new Timer(() => {
      this.disconnect(() => this.connect());
    }, this.reconnectAfterMs);
  }
  protocol() {
    return location.protocol.match(/^https/) ? "wss" : "ws";
  }
  endPointURL() {
    let uri = Ajax.appendParams(Ajax.appendParams(this.endPoint, this.params), { vsn: VSN });
    if (uri.charAt(0) !== "/") {
      return uri;
    }
    if (uri.charAt(1) === "/") {
      return `${this.protocol()}:${uri}`;
    }
    return `${this.protocol()}://${location.host}${uri}`;
  }
  disconnect(callback, code, reason) {
    if (this.conn) {
      this.conn.onclose = function() {
      };
      if (code) {
        this.conn.close(code, reason || "");
      } else {
        this.conn.close();
      }
      this.conn = null;
    }
    callback && callback();
  }
  connect(params) {
    if (params) {
      console && console.log("passing params to connect is deprecated. Instead pass :params to the Socket constructor");
      this.params = params;
    }
    if (this.conn) {
      return;
    }
    this.conn = new this.transport(this.endPointURL());
    this.conn.timeout = this.longpollerTimeout;
    this.conn.onopen = () => this.onConnOpen();
    this.conn.onerror = (error) => this.onConnError(error);
    this.conn.onmessage = (event) => this.onConnMessage(event);
    this.conn.onclose = (event) => this.onConnClose(event);
  }
  log(kind, msg, data) {
    this.logger(kind, msg, data);
  }
  onOpen(callback) {
    this.stateChangeCallbacks.open.push(callback);
  }
  onClose(callback) {
    this.stateChangeCallbacks.close.push(callback);
  }
  onError(callback) {
    this.stateChangeCallbacks.error.push(callback);
  }
  onMessage(callback) {
    this.stateChangeCallbacks.message.push(callback);
  }
  onConnOpen() {
    this.log("transport", `connected to ${this.endPointURL()}`, this.transport.prototype);
    this.flushSendBuffer();
    this.reconnectTimer.reset();
    if (!this.conn.skipHeartbeat) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
    }
    this.stateChangeCallbacks.open.forEach((callback) => callback());
  }
  onConnClose(event) {
    this.log("transport", "close", event);
    this.triggerChanError();
    clearInterval(this.heartbeatTimer);
    this.reconnectTimer.scheduleTimeout();
    this.stateChangeCallbacks.close.forEach((callback) => callback(event));
  }
  onConnError(error) {
    this.log("transport", error);
    this.triggerChanError();
    this.stateChangeCallbacks.error.forEach((callback) => callback(error));
  }
  triggerChanError() {
    this.channels.forEach((channel) => channel.trigger(CHANNEL_EVENTS.error));
  }
  connectionState() {
    switch (this.conn && this.conn.readyState) {
      case SOCKET_STATES.connecting:
        return "connecting";
      case SOCKET_STATES.open:
        return "open";
      case SOCKET_STATES.closing:
        return "closing";
      default:
        return "closed";
    }
  }
  isConnected() {
    return this.connectionState() === "open";
  }
  remove(channel) {
    this.channels = this.channels.filter((c) => c.joinRef() !== channel.joinRef());
  }
  channel(topic, chanParams = {}) {
    let chan = new Channel(topic, chanParams, this);
    this.channels.push(chan);
    return chan;
  }
  push(data) {
    let { topic, event, payload, ref } = data;
    let callback = () => this.conn.send(JSON.stringify(data));
    this.log("push", `${topic} ${event} (${ref})`, payload);
    if (this.isConnected()) {
      callback();
    } else {
      this.sendBuffer.push(callback);
    }
  }
  makeRef() {
    let newRef = this.ref + 1;
    if (newRef === this.ref) {
      this.ref = 0;
    } else {
      this.ref = newRef;
    }
    return this.ref.toString();
  }
  sendHeartbeat() {
    if (!this.isConnected()) {
      return;
    }
    this.push({ topic: "phoenix", event: "heartbeat", payload: {}, ref: this.makeRef() });
  }
  flushSendBuffer() {
    if (this.isConnected() && this.sendBuffer.length > 0) {
      this.sendBuffer.forEach((callback) => callback());
      this.sendBuffer = [];
    }
  }
  onConnMessage(rawMessage) {
    let msg = JSON.parse(rawMessage.data);
    let { topic, event, payload, ref } = msg;
    this.log("receive", `${payload.status || ""} ${topic} ${event} ${ref && "(" + ref + ")" || ""}`, payload);
    this.channels.filter((channel) => channel.isMember(topic)).forEach((channel) => channel.trigger(event, payload, ref));
    this.stateChangeCallbacks.message.forEach((callback) => callback(msg));
  }
}

class LongPoll {
  constructor(endPoint) {
    this.endPoint = null;
    this.token = null;
    this.skipHeartbeat = true;
    this.onopen = function() {
    };
    this.onerror = function() {
    };
    this.onmessage = function() {
    };
    this.onclose = function() {
    };
    this.pollEndpoint = this.normalizeEndpoint(endPoint);
    this.readyState = SOCKET_STATES.connecting;
    this.poll();
  }
  normalizeEndpoint(endPoint) {
    return endPoint.replace("ws://", "http://").replace("wss://", "https://").replace(new RegExp("(.*)/" + TRANSPORTS.websocket), "$1/" + TRANSPORTS.longpoll);
  }
  endpointURL() {
    return Ajax.appendParams(this.pollEndpoint, { token: this.token });
  }
  closeAndRetry() {
    this.close();
    this.readyState = SOCKET_STATES.connecting;
  }
  ontimeout() {
    this.onerror("timeout");
    this.closeAndRetry();
  }
  poll() {
    if (!(this.readyState === SOCKET_STATES.open || this.readyState === SOCKET_STATES.connecting)) {
      return;
    }
    Ajax.request("GET", this.endpointURL(), "application/json", null, this.timeout, this.ontimeout.bind(this), (resp) => {
      if (resp) {
        var { status: status2, token, messages } = resp;
        this.token = token;
      } else {
        var status2 = 0;
      }
      switch (status2) {
        case 200:
          messages.forEach((msg) => this.onmessage({ data: JSON.stringify(msg) }));
          this.poll();
          break;
        case 204:
          this.poll();
          break;
        case 410:
          this.readyState = SOCKET_STATES.open;
          this.onopen();
          this.poll();
          break;
        case 0:
        case 500:
          this.onerror();
          this.closeAndRetry();
          break;
        default:
          throw `unhandled poll status ${status2}`;
      }
    });
  }
  send(body) {
    Ajax.request("POST", this.endpointURL(), "application/json", body, this.timeout, this.onerror.bind(this, "timeout"), (resp) => {
      if (!resp || resp.status !== 200) {
        this.onerror(status);
        this.closeAndRetry();
      }
    });
  }
  close(code, reason) {
    this.readyState = SOCKET_STATES.closed;
    this.onclose();
  }
}

class Ajax {
  static request(method, endPoint, accept, body, timeout, ontimeout, callback) {
    if (window.XDomainRequest) {
      let req = new XDomainRequest;
      this.xdomainRequest(req, method, endPoint, body, timeout, ontimeout, callback);
    } else {
      let req = window.XMLHttpRequest ? new XMLHttpRequest : new ActiveXObject("Microsoft.XMLHTTP");
      this.xhrRequest(req, method, endPoint, accept, body, timeout, ontimeout, callback);
    }
  }
  static xdomainRequest(req, method, endPoint, body, timeout, ontimeout, callback) {
    req.timeout = timeout;
    req.open(method, endPoint);
    req.onload = () => {
      let response = this.parseJSON(req.responseText);
      callback && callback(response);
    };
    if (ontimeout) {
      req.ontimeout = ontimeout;
    }
    req.onprogress = () => {
    };
    req.send(body);
  }
  static xhrRequest(req, method, endPoint, accept, body, timeout, ontimeout, callback) {
    req.timeout = timeout;
    req.open(method, endPoint, true);
    req.setRequestHeader("Content-Type", accept);
    req.onerror = () => {
      callback && callback(null);
    };
    req.onreadystatechange = () => {
      if (req.readyState === this.states.complete && callback) {
        let response = this.parseJSON(req.responseText);
        callback(response);
      }
    };
    if (ontimeout) {
      req.ontimeout = ontimeout;
    }
    req.send(body);
  }
  static parseJSON(resp) {
    return resp && resp !== "" ? JSON.parse(resp) : null;
  }
  static serialize(obj, parentKey) {
    let queryStr = [];
    for (var key in obj) {
      if (!obj.hasOwnProperty(key)) {
        continue;
      }
      let paramKey = parentKey ? `${parentKey}[${key}]` : key;
      let paramVal = obj[key];
      if (typeof paramVal === "object") {
        queryStr.push(this.serialize(paramVal, paramKey));
      } else {
        queryStr.push(encodeURIComponent(paramKey) + "=" + encodeURIComponent(paramVal));
      }
    }
    return queryStr.join("&");
  }
  static appendParams(url, params) {
    if (Object.keys(params).length === 0) {
      return url;
    }
    let prefix = url.match(/\?/) ? "&" : "?";
    return `${url}${prefix}${this.serialize(params)}`;
  }
}
Ajax.states = { complete: 4 };
class Timer {
  constructor(callback, timerCalc) {
    this.callback = callback;
    this.timerCalc = timerCalc;
    this.timer = null;
    this.tries = 0;
  }
  reset() {
    this.tries = 0;
    clearTimeout(this.timer);
  }
  scheduleTimeout() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.tries = this.tries + 1;
      this.callback();
    }, this.timerCalc(this.tries + 1));
  }
}

// ws_connect.ts
var socket = new Socket("ws://localhost:4000/socket");
socket.connect();
var channel = socket.channel("room:chat", {});
channel.join().receive("ok", (resp) => {
  console.log("Joined successfully!", resp);
}).receive("error", (resp) => {
  console.log("Unable to join", resp);
});
channel.push("new_msg", { body: "zizi" });
