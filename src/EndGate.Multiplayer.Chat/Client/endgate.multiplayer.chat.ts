///<reference path="typings/jquery/jquery.d.ts"/>
///<reference path="typings/signalr/signalr.d.ts"/>
///<reference path="typings/endgate/endgate-0.2.0.d.ts"/>
module EndGate.Multiplayer {
    export class ChatAdapter {
        public OnMessageReceived: eg.EventHandler1<ChatMessage>;
        public OnConnected: eg.EventHandler1<ChatConnected>;
        public OnUserJoined: eg.EventHandler1<string>;
        public Proxy: HubProxy;
        public Connection: HubConnection;

        constructor() {
            this.Connection = $.connection.hub;
            this.Proxy = (<any>$.connection).chat;

            var savedProxyInvoke = this.Proxy.invoke;

            this.OnMessageReceived = new eg.EventHandler1<ChatMessage>();
            this.OnUserJoined = new eg.EventHandler1<string>();
            this.OnConnected = new eg.EventHandler1<ChatConnected>();

            (<any>this.Proxy.invoke) = () => {
                if ((<any>this.Connection).state === $.signalR.connectionState.connected) {
                    return savedProxyInvoke.apply(this.Proxy, arguments);
                }
            };

            (<any>this.Connection).stateChanged((state) => {
                if (state.oldState === 0 && state.newState === $.signalR.connectionState.connected) {
                    (<any>this.Proxy).invoke("join")
                        .done((data: any) => {
                            this.OnConnected.Trigger(new ChatConnected(data.Name, data.Id));
                        })
                        .fail((e: any, g: any) => {
                            console.log(e, g);
                        });

                }
            });

            this.Wire();
        }

        private Wire(): void {
            this.Proxy.on("chatMessage", (from: string, message: string, type: number) => {
                this.OnMessageReceived.Trigger(new ChatMessage(from, message, type));
            });
            this.Proxy.on("chatUserJoined", (data: any) => {
                console.log("user joined", data);
                this.OnUserJoined.Trigger(data.Name);
            });
        }
    }

    export enum ChatMessageType {
        User = 0,
        System = 1
    }

    export class ChatMessage {
        public _Handled: boolean = false;
        constructor(public From: string, public Message: string, public Type: ChatMessageType) { }

        public PreventDefault(): void {
            this._Handled = true;
        }
    }

    export class ChatConnected {
        constructor(public Name: string, public Id: any) {
        }
    }

    export class ChatHandler {
        private _document: JQuery = $(document);
        private _chatContainer: JQuery;
        private _chatBox: JQuery = $("<input>").attr("id", "chatbox").attr("type", "input").attr("autocomplete", "off");
        private _chatBoxContainer: JQuery = $("<li>");
        private _chatBoxVisible: boolean = false;
        private _name: string;
        private _colors: string[] = [
            eg.Graphics.Color.Red.toString(),
            eg.Graphics.Color.Orange.toString(),
            eg.Graphics.Color.Yellow.toString(),
            eg.Graphics.Color.Green.toString(),
            eg.Graphics.Color.Blue.toString(),
            eg.Graphics.Color.Purple.toString(),
            eg.Graphics.Color.White.toString(),
            eg.Graphics.Color.Cyan.toString()
        ];

        private _systemMessageColor: string = eg.Graphics.Color.Yellow.toString();

        public OnMessageReceived = new eg.EventHandler1<ChatMessage>();
        public OnUserJoined = new eg.EventHandler1<string>();

        constructor() {
            //drop the chat box in there
            this._chatContainer = $("<ul>").attr("id", "eg-chat");
            $("body").append(this._chatContainer);
            var serverAdapter = new ChatAdapter();

            serverAdapter.OnMessageReceived.Bind((chat: ChatMessage) => {
                this.AddMessage(chat);
            });

            serverAdapter.OnUserJoined.Bind((chat: string) => {
                console.log(chat);
            });

            serverAdapter.OnConnected.Bind((connected: ChatConnected) => {
                this._name = connected.Name;
            });

            this._chatBoxContainer.append(this._chatBox);
            this._document.keydown((key) => {
                switch (key.keyCode) {
                    //if they press enter
                    case 13:
                        if (this._chatBoxVisible) {
                            var message = this._chatBox.val();
                            if (message) {
                                this.AddMessage(new ChatMessage(this._name, message, ChatMessageType.User));
                                serverAdapter.Proxy.invoke("sendMessage", message);
                            }
                            this.HideChatBox();
                        } else {
                            this.ShowChatBox();
                        }

                        this.StopPropogation(key);
                        break;

                    //the letter 't'
                    case 84:
                        if (!this._chatBoxVisible) {
                            this.ShowChatBox();
                            this.StopPropogation(key);
                        }
                        //determine status of chat box
                        break;

                    //escape key
                    case 27: //close the chat box if open
                        if (this._chatBoxVisible) {
                            this.HideChatBox();
                            this.StopPropogation(key);
                        }
                        break;
                }
            });
        }

        private StopPropogation(key): void {
            key.preventDefault();
            key.stopPropagation();
        }

        private ShowChatBox(): void {
            this._chatContainer.append(this._chatBoxContainer);
            this._chatBoxContainer.show();
            this._chatBox.focus();
            this._chatBoxVisible = true;
        }

        private HideChatBox(): void {
            this._chatBox.val("");
            this._chatBoxContainer.remove();
            this._chatBoxVisible = false;
        }

        private AddMessage(chatMessage: ChatMessage): void {
            this.OnMessageReceived.Trigger(chatMessage);

            if (!chatMessage._Handled) {
                //User message
                if (chatMessage.Type === ChatMessageType.User) {
                    var color = this._colors[this.GetHashCode(chatMessage.From) % this._colors.length],
                        playerName = $("<span>").text(chatMessage.From).css("color", color),
                        message = $("<span>").append($("<div/>").text(chatMessage.Message).html().replace(/\"/g, "&quot;"));

                    //only insert new items before the chat box so that the chat box stays at the
                    //bottom of the screen and doesn't scroll up.
                    if (this._chatBoxVisible) {
                        $("<li>")
                            .append(playerName)
                            .append($("<span>").text(": "))
                            .append(message)
                            .insertBefore(this._chatBoxContainer);
                    } else {
                        this._chatContainer.append($("<li>")
                            .append(playerName)
                            .append($("<span>").text(": "))
                            .append(message));
                    }
                }

                //System message
                if (chatMessage.Type === ChatMessageType.System) {
                    this._chatContainer.append($("<li>")
                        .append(chatMessage.Message)
                        .css("color", this._systemMessageColor));
                }

                if (this._chatContainer.children.length > 100) {
                    this._chatContainer.children[0].remove();
                }
            }
        }

        private GetHashCode(name: string): number {
            var hash = 0, i, c, l;
            if (name.length === 0) return hash;
            for (i = 0, l = name.length; i < l; i++) {
                c = name.charCodeAt(i);
                hash = ((hash << 5) - hash) + c;
                hash |= 0;
            }
            return hash;
        }
    }

    export var Chat = new EndGate.Multiplayer.ChatHandler();
}