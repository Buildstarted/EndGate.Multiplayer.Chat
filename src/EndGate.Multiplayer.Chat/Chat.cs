namespace EndGate.Multiplayer
{
    using Microsoft.AspNet.SignalR;
    using Microsoft.AspNet.SignalR.Hubs;

    public class Chat : Hub
    {
        private IChatNameResolver _resolver;

        public Chat()
            : this(new DefaultChatNameResolver())
        {

        }

        public Chat(IChatNameResolver resolver)
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
            var user = Context.ConnectionId;
            Clients.Others.chatMessage(user, message, 0);
        }
    }

    public class DefaultChatNameResolver : IChatNameResolver
    {
        public object Resolve(HubCallerContext context)
        {
            return new
            {
                Name = context.ConnectionId,
                Id = context.ConnectionId
            };
        }
    }

    public interface IChatNameResolver
    {
        object Resolve(HubCallerContext context);
    }
}