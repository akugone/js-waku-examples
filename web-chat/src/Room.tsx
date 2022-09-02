import { PushResponse, WakuMessage } from "js-waku";
import { ChatContentTopic } from "./App";
import ChatList from "./ChatList";
import MessageInput from "./MessageInput";
import { useWaku } from "./WakuContext";
import { TitleBar } from "@livechat/ui-kit";
import { Message } from "./Message";
import { ChatMessage } from "./chat_message";
import { useEffect, useState } from "react";

interface Props {
  messages: Message[];
  commandHandler: (cmd: string) => void;
  nick: string;
}

export default function Room(props: Props) {
  const { waku } = useWaku();

  const [storePeers, setStorePeers] = useState(0);
  const [filterPeers, setFilterPeers] = useState(0);
  const [lightPushPeers, setLightPushPeers] = useState(0);

  useEffect(() => {
    if (!waku) return;

    // Update store peer when new peer connected & identified
    waku.libp2p.peerStore.addEventListener("change:protocols", async () => {
      const storePeers = await waku.store.peers();
      setStorePeers(storePeers.length);

      const filterPeers = await waku.filter.peers();
      setFilterPeers(filterPeers.length);

      const lightPushPeers = await waku.lightPush.peers();
      setLightPushPeers(lightPushPeers.length);
    });
  }, [waku]);

  return (
    <div
      className="chat-container"
      style={{ height: "98vh", display: "flex", flexDirection: "column" }}
    >
      <TitleBar
        leftIcons={[
          `Peers: ${lightPushPeers} light push, ${filterPeers} filter, ${storePeers} store.`,
        ]}
        title="Waku v2 chat app"
      />
      <ChatList messages={props.messages} />
      <MessageInput
        sendMessage={
          waku
            ? async (messageToSend) => {
                return handleMessage(
                  messageToSend,
                  props.nick,
                  props.commandHandler,
                  waku.lightPush.push.bind(waku.lightPush)
                );
              }
            : undefined
        }
      />
    </div>
  );
}

async function handleMessage(
  message: string,
  nick: string,
  commandHandler: (cmd: string) => void,
  messageSender: (msg: WakuMessage) => Promise<PushResponse | null>
) {
  if (message.startsWith("/")) {
    commandHandler(message);
  } else {
    const timestamp = new Date();
    const chatMessage = ChatMessage.fromUtf8String(timestamp, nick, message);
    const wakuMsg = await WakuMessage.fromBytes(
      chatMessage.encode(),
      ChatContentTopic,
      { timestamp }
    );
    await messageSender(wakuMsg);
  }
}
