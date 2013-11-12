namespace EndGate.Multiplayer.Server
{
    using Microsoft.AspNet.SignalR;

    public class Chat : Hub
    {
        private readonly IChatUserResolver _resolver;

        public Chat() : this(new DefaultChatUserResolver()) { }

        public Chat(IChatUserResolver resolver)
        {
            this._resolver = resolver;
        }

        public object Join()
        {
            var user = _resolver.Resolve(Context);
            Clients.Others.chatUserJoined(user);

            return user;
        }

        public void SendMessage(string message)
        {
            var user = _resolver.Resolve(Context);
            Clients.Others.chatMessage(user, message, 0);
        }
    }
}