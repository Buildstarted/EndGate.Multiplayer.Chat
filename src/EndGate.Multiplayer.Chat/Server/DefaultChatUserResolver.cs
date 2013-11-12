namespace EndGate.Multiplayer.Server
{
    using Microsoft.AspNet.SignalR.Hubs;

    public class DefaultChatUserResolver : IChatUserResolver
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
}